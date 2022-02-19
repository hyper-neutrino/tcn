const StatusError = (exports.StatusError = class extends Error {
    constructor(color, emoji, title, message, fields) {
        super(message);
        this.color = color;
        this.emoji = emoji;
        this.title = title;
        this.fields = fields || [];
    }
});

exports.CommandSyntaxError = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "RED",
            "❌",
            title === undefined && message ? "Command Syntax Error" : title,
            message,
            fields
        );
    }
};

exports.ArgumentError = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "RED",
            "❌",
            title === undefined && message ? "Argument Error" : title,
            message,
            fields
        );
    }
};

exports.InternalError = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "AQUA",
            "❗",
            title === undefined && message ? "Internal Error" : title,
            message,
            fields
        );
    }
};

exports.PermissionError = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "PURPLE",
            "⛔",
            title === undefined && message ? "Permission Error" : title,
            message,
            fields
        );
    }
};

exports.Canceled = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "RED",
            "🟥",
            title === undefined && message ? "Canceled" : title,
            message,
            fields
        );
    }
};

exports.TimedOut = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "BLUE",
            "⌛",
            title === undefined && message ? "Timed Out" : title,
            message,
            fields
        );
    }
};

exports.Info = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "GREY",
            "ℹ️",
            title === undefined && message ? "Info" : title,
            message,
            fields
        );
    }
};

exports.PartialSuccess = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "GOLD",
            "🟨",
            title === undefined && message ? "Partial Success" : title,
            message,
            fields
        );
    }
};

exports.Success = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "GREEN",
            "✅",
            title === undefined && message ? "Success" : title,
            message,
            fields
        );
    }
};

exports.Usage = class extends StatusError {
    constructor(message, title, fields) {
        super(
            "LUMINOUS_VIVID_PINK",
            "ℹ️",
            title === undefined ? "Usage" : title,
            message,
            fields
        );
    }
};
