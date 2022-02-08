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
        super("RED", "❌", title || "Command Syntax Error", message, fields);
    }
};

exports.ArgumentError = class extends StatusError {
    constructor(message, title, fields) {
        super("RED", "❌", "Argument Error", message, fields);
    }
};

exports.InternalError = class extends StatusError {
    constructor(message, title, fields) {
        super("AQUA", "❗", "Internal Error", message, fields);
    }
};

exports.PermissionError = class extends StatusError {
    constructor(message, title, fields) {
        super("PURPLE", "⛔", "Permission Error", message, fields);
    }
};

exports.Canceled = class extends StatusError {
    constructor(message, title, fields) {
        super("RED", "🟥", "Canceled", message, fields);
    }
};

exports.TimedOut = class extends StatusError {
    constructor(message, title, fields) {
        super("BLUE", "⌛", "Timed Out", message, fields);
    }
};

exports.Info = class extends StatusError {
    constructor(message, title, fields) {
        super("GREY", "ℹ️", title || "Info", message, fields);
    }
};

exports.PartialSuccess = class extends StatusError {
    constructor(message, title, fields) {
        super("GOLD", "🟨", title || "Partial Success", message, fields);
    }
};

exports.Success = class extends StatusError {
    constructor(message, title, fields) {
        super("GREEN", "✅", title || "Success", message, fields);
    }
};
