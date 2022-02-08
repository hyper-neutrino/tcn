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
            title === undefined ? "Command Syntax Error" : title,
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
            title === undefined ? "Argument Error" : title,
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
            title === undefined ? "Internal Error" : title,
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
            title === undefined ? "Permission Error" : title,
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
            title === undefined ? "Canceled" : title,
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
            title === undefined ? "Timed Out" : title,
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
            title === undefined ? "Info" : title,
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
            title === undefined ? "Partial Success" : title,
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
            title === undefined ? "Success" : title,
            message,
            fields
        );
    }
};
