const body_parser = require("body-parser");
const session = require("express-session");
const express = require("express");
const { default: fetch } = require("node-fetch");
const path = require("path");
const pg = require("pg");
const pug = require("pug");
const config = require("../config.json");
const {
    has_server,
    has_permission,
    get_tags,
    create_report,
    get_report,
} = require("./db");
const { client } = require("./client");

const app = express();

app.use("/static", express.static(path.join(__dirname, "website/static")));
app.use(body_parser.urlencoded({ extended: true }));
app.use(body_parser.json());
app.use(body_parser.raw());
app.use(
    session({
        store: new (require("connect-pg-simple")(session))({
            pool: new pg.Pool(config.db_options),
            createTableIfMissing: true,
        }),
        secret: config.session_secret,
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: 14 * 24 * 60 * 60 * 1000,
        },
    })
);

app.use(function (req, res, next) {
    req.session.flashes ||= [];
    req.flash = function (message, category) {
        req.session.flashes.push({ message, category });
    };
    req.render = function (file, options) {
        options ||= {};
        options.flashes = req.session.flashes || [];
        req.session.flashes = undefined;
        options.req = req;
        return pug.renderFile(
            path.join(__dirname, "website/templates", file),
            options
        );
    };
    next();
});

app.use(function (err, req, res, next) {
    console.error("EXPRESSJS ERROR");
    console.error("===============");
    console.error(err);
    res.status(500).send(
        "An unexpected internal error occurred. Please contact a developer if this persists. <a href='/'>Return to Home Page</a>."
    );
});

app.use(function (req, res, next) {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url} ${
            res.statusCode
        }`
    );
    next();
});

function randomState() {
    var string = "";
    for (var x = Math.floor(Math.random() * 10) + 20; x > 0; x--) {
        string += String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }
    return string;
}

const guilds_cache = new Map();

function oauth(force) {
    return function (req, res, next) {
        if (req.session.discord_token === undefined) {
            res.send(
                req.render("redirect.pug", {
                    client_id: config.client.id,
                    domain: encodeURIComponent(config.domain),
                    state: encodeURIComponent(
                        (req.session.state = randomState())
                    ),
                })
            );
        } else {
            fetch("https://discord.com/api/v8/users/@me", {
                headers: {
                    Authorization: "Bearer " + req.session.discord_token,
                },
            })
                .then((response) => response.json())
                .then((json) => {
                    if (json.code == 0) {
                        res.redirect(303, "/logout/");
                        return;
                    }
                    req.user = json;
                    req.user.tag = `${req.user.username}#${req.user.discriminator}`;
                    if (guilds_cache.has(req.user.id) && !force) {
                        req.guilds = guilds_cache.get(req.user.id);
                        next();
                    } else {
                        fetch("https://discord.com/api/v8/users/@me/guilds", {
                            headers: {
                                Authorization:
                                    "Bearer " + req.session.discord_token,
                            },
                        })
                            .then((response) => response.json())
                            .then((json) => {
                                if (Array.isArray(json)) {
                                    guilds_cache.set(req.user.id, json);
                                    req.guilds = json;
                                } else {
                                    req.guilds ||= [];
                                }
                                next();
                            })
                            .catch((error) => {
                                req.flash(
                                    "Unknown failure retrieving your guild list. Please make sure you haven't modified the OAuth2 link.",
                                    "ERROR"
                                );
                                res.redirect(303, "/force-logout/");
                            });
                    }
                })
                .catch((error) => {
                    req.flash(
                        "Unknown failure fetching your user account. Your access token may have expired; please log in again.",
                        "ERROR"
                    );
                    res.redirect(303, "/force-logout/");
                });
        }
    };
}

app.get("/discord-oauth/", (req, res) => {
    if (req.query.state != req.session.state) {
        req.flash(
            "Invalid state; someone may have attempted to hijack you via an OAuth link not generated by this website.",
            "ERROR"
        );
        res.redirect(303, "/fail/");
    }
    const code = req.query.code;
    fetch("https://discord.com/api/v8/oauth2/token", {
        method: "post",
        body: new URLSearchParams({
            client_id: config.client.id,
            client_secret: config.client.secret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: config.domain + "/discord-oauth/",
        }),
    })
        .then((response) => response.json())
        .then((json) => {
            if (json.access_token === undefined) {
                req.flash(
                    "Something unexpected happened during the OAuth2 process. Please try again.",
                    "ERROR"
                );
                res.redirect(303, "/fail/");
            } else {
                req.session.discord_token = json.access_token;
                res.redirect(303, "/fail/");
            }
        })
        .catch((error) => {
            req.flash(
                "An unexpected error occurred fetching the access token from your OAuth authorization. Please try again.",
                "ERROR"
            );
            res.redirect(303, "/fail/");
        });
});

app.param("guild", async (req, res, next, id) => {
    try {
        if (!(await has_server((req.guild = await client.guilds.fetch(id)))))
            throw 0;
        next();
    } catch (error) {
        req.flash(
            "Guild not found / not approved as part of the TCN.",
            "ERROR"
        );
        res.redirect(303, "/");
    }
});

app.param("report", async (req, res, next, id) => {
    try {
        req.report = await get_report(id);
        next();
    } catch {
        req.flash("That report does not exist.", "ERROR");
        res.redirect(303, "/");
    }
});

app.get("/", oauth(true), async (req, res) => {
    const servers = [];
    for (const partial_guild of req.guilds) {
        if (!(await has_server(partial_guild))) continue;
        if (!client.guilds.cache.has(partial_guild.id)) continue;
        try {
            const guild = await client.guilds.fetch(partial_guild.id);
            const member = await guild.members.fetch(req.user.id);
            if (await has_permission(member, "admin")) {
                servers.push(guild);
            }
        } catch (error) {
            console.error(error);
        }
    }
    res.send(req.render("index.pug", { servers }));
});

app.get("/reports/:guild/create/", oauth(false), async (req, res) => {
    res.send(req.render("push.pug", { tags: await get_tags() }));
});

app.post("/reports/:guild/create/", oauth(false), async (req, res) => {
    const tags = Object.keys(req.body)
        .filter((name) => name.startsWith("tag-") && req.body[name] == "on")
        .map((name) => name.substring(4));
    const actions = [];
    for (const type of ["ban", "kick", "mute"]) {
        for (const id of req.body[`${type}s`].match(/\d+/g) || []) {
            actions.push({ type, id });
        }
    }
    const fail = async function () {
        res.send(
            req.render("push.pug", {
                tags: await get_tags(),
                entry: { tags: new Set(tags) },
            })
        );
    };
    try {
        var id;
        await (
            await client.channels.fetch(config.hq_channel)
        ).send({
            embeds: [
                await embed_report(
                    await get_report(
                        (id = await create_report(
                            tags,
                            req.guild,
                            req.user,
                            req.body.summary.trim(),
                            req.body.details.trim(),
                            req.body.recommendations.trim(),
                            actions
                        ))
                    )
                ),
            ],
            components: [
                {
                    type: "ACTION_ROW",
                    components: [
                        {
                            type: "BUTTON",
                            style: "SUCCESS",
                            customId: `push.${id}`,
                            label: "PUSH",
                        },
                    ],
                },
            ],
        });
        req.flash(
            "Your report has been created and will be reviewed by observers to be pushed.",
            "SUCCESS"
        );
        res.redirect(303, `/view-report/${id}`);
    } catch (error) {
        console.error(error);
        req.flash(
            "An unexpected error occurred while creating this incident report.",
            "ERROR"
        );
        await fail();
    }
});

app.get("/view-report/:report", oauth(false), async (req, res) => {
    var perms = await has_permission(req.user, "observer");
    if (!perms) {
        for (const partial_guild of req.guilds) {
            if (!(await has_server(partial_guild))) continue;
            try {
                const guild = await client.guilds.fetch(partial_guild.id);
                const member = await guild.members.fetch(req.user.id);
                for (const level of [
                    "owner",
                    "advisor",
                    "admin",
                    "moderator",
                ]) {
                    if (await has_permission(member, level)) {
                        perms = true;
                        break;
                    }
                }
                if (perms) break;
            } catch {}
        }
        if (!perms) {
            req.flash(
                "You must be an observer or a moderator on at least one TCN partner server to view reports.",
                "ERROR"
            );
            res.redirect(303, "/");
            return;
        }
    }
    var guild;
    try {
        guild = await client.guilds.fetch(req.report.report.origin);
    } catch {}
    var submitter;
    try {
        submitter = await client.users.fetch(req.report.report.author);
    } catch {}
    res.send(
        req.render("viewreport.pug", { report: req.report, guild, submitter })
    );
});

const push = (exports.push = async function (id) {
    console.log("PUSH", id);
});

app.get("/push/:report", oauth(false), async (req, res) => {});

app.get("/fail/", (req, res) => {
    res.send(req.render("fail.pug"));
});

app.get("/logout/", function (req, res) {
    req.session.discord_token = undefined;
    res.redirect(303, "/");
});

app.get("/force-logout/", function (req, res) {
    req.session.discord_token = undefined;
    res.redirect(303, "/fail/");
});

app.listen(config.port, () => {
    console.log(`Website started on port ${config.port}.`);
});

async function embed_report(data) {
    const guild = await client.guilds.fetch(data.report.origin);
    const user = await client.users.fetch(data.report.author);
    const actions = { ban: 0, kick: 0, mute: 0 };
    for (const action of data.actions) {
        actions[action.type]++;
    }
    return {
        title: `Incident Report from ${guild.name}`,
        description: `${[...data.tags]
            .sort()
            .map((tag) => `[${tag}]`)
            .join(", ")}\nFrom ${user.tag}`,
        fields: [
            {
                name: "Summary",
                value: limit(data.body.summary, 1024),
            },
            {
                name: "Details / Evidence / Context",
                value: limit(data.body.details, 1024),
            },
            {
                name: "Recommendations",
                value: limit(data.body.recommendations, 1024),
            },
            actions.ban + actions.kick + actions.mute > 0
                ? {
                      name: "Action List",
                      value: `The following action(s) are available at the press of a button: \` ${
                          actions.mute > 0 ? `mute ${actions.mute} ` : ""
                      }${actions.kick > 0 ? `kick ${actions.kick} ` : ""}${
                          actions.ban > 0 ? `ban ${actions.ban} ` : ""
                      }\`(Visit the website to see the full list)`,
                  }
                : [],
        ].flat(),
        url: `${config.domain}/view-report/${data.body.id}`,
        color: "GOLD",
    };
}

function limit(string, length) {
    if (string.length <= length) return string;
    else return `${string.substring(0, length - 3)}...`;
}
