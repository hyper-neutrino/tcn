$(document).ready(function () {
    $("form").submit(function (e) {
        if (![...$(".tagcheckbox")].some((element) => element.checked)) {
            M.toast({
                html: `You must select at least one tag.`,
                classes: "red",
            });
            e.preventDefault();
            return;
        }
        for (const id of ["bans", "kicks", "mutes"]) {
            const str = $(`[name=${id}]`).val();
            for (const char of str) {
                const code = char.charCodeAt(0);
                if (code < 32 || code > 126) {
                    M.toast({
                        html: `Your ${id} list has non-ASCII characters in it! These are not allowed because they might cause issues if they aren't meant to be there, so please remove them.`,
                        classes: "red",
                    });
                    e.preventDefault();
                    return;
                }
            }
        }
    });
});
