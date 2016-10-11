"use strict";

var num_logs = 0;

var log_structure = {};

var compile_logs = function () {

    log_structure.lines = [];

    $('#builder .loggroup').each(function (i, div) {

        var logformline = $(div);
        var log_dict = {};
        var idx = logformline.attr("data-group");

        log_dict.label = logformline.find("#loglabel" + idx).val();
        log_dict.color = logformline.find("#logcolor" + idx).val();

        log_dict.file = logformline.find("#logfile" + idx).val();
        log_dict.ssh = logformline.find("#logssh" + idx).val();

        log_dict.split = logformline.find("#logsplit" + idx).is(':checked');
        log_dict.remote = logformline.find("#logremote" + idx).is(':checked');
        log_dict.comm = logformline.find("#logcomm" + idx).is(':checked');

        log_structure.lines[i] = log_dict;
    });

    delete log_structure.desc;
    if ($("#description").val()) {
        log_structure.desc = $("#description").val();
    }

    delete log_structure.mark;
    if ($("#markinterval").val() != 0) {
        log_structure.mark = $("#markinterval").val();
    }

    // Get rid of any empty keys to save space
    for (var i = 0; i < log_structure.lines.length; i++) {
        var log = log_structure.lines[i];

        $.each(log, function (key, value) {
            if (!log[key]) {
                delete log[key];
            }
        });
    }

    delete log_structure.encoded;

    var json = JSON.stringify(log_structure);
    // console.log(json.length, json);

    var compressed = LZString.compressToEncodedURIComponent(json);
    // console.log(compressed.length, compressed);

    log_structure.encoded = compressed;
    return log_structure;
};

var script_link = function () {
    return sprintf("%s//%s%s?d=%s", document.location.protocol, document.location.hostname, document.location.pathname, log_structure.encoded)

};

var create_command = function () {

    compile_logs();

    var base_command = "#!/usr/bin/env bash\n\n";
    base_command += "# Made with \"Get you a multitail\"\n";
    base_command += sprintf("# %s\n\n", script_link());

    if (log_structure.desc) {
        base_command += sprintf("# %s\n\n", log_structure.desc);
    }

    base_command += "multitail -m 0 ";

    if (log_structure.mark) {
        base_command += sprintf("--mark-interval %i ", log_structure.mark);
    }

    var all_log_commands = "";

    for (var i = 0; i < log_structure.lines.length; i++) {

        var log = log_structure.lines[i];
        var log_commands = "";

        if (log.label) {
            log_commands += sprintf("--label '[%s] ' ", log.label);
        }

        if (log.color) {
            log_commands += sprintf("-ci %s ", log.color);
        }

        if (log.file) {

            if (i > 0) {
                if (!log.remote && !log.comm) {
                    log_commands += log.split ? "-i " : "-I ";
                } else {
                    log_commands += log.split ? "-l " : "-L ";
                }
            }

            if (log.remote && !log.comm) {
                log_commands += sprintf("'ssh %s \"tail -q -f %s\"' ", log.ssh, log.file);

            } else if (log.remote && log.comm) {
                log_commands += sprintf("'ssh %s \"%s\"' ", log.ssh, log.file);

            } else if (!log.remote) {
                log_commands += sprintf("'%s' ", log.file);

            }

        }

        // if (i + 1 < num_logs) {
        //     log_commands += "\\ \n";
        // }

        if (log.file) {
            all_log_commands += log_commands;
        }

    }

    if (all_log_commands != "") {
        return base_command + all_log_commands;
    } else {
        return "";
    }

};

var update = function (evt) {

    updateLogGroup(evt);
    $('#result').text(create_command());
    $('#link a').attr("href", script_link());

    // $('.twitter-share-button').attr("data-url", script_link());
};

var updateLogGroup = function (evt) {
    if (evt) {

        evt = $(evt)[0];
        var loggroup = $(evt.currentTarget);
        // console.log(loggroup);

        if (loggroup.is("input")) {
            // console.log($(evt.currentTarget).parents(".loggroup"));
            loggroup = $(evt.currentTarget).parents(".loggroup");
        }


        var ctl = evt.target;
        // console.log(ctl);

        var datagroup = loggroup.attr("data-group");
        // console.log(datagroup);

        if (ctl.id == "logremote" + datagroup) {

            var targetGroup = $("#logssh" + datagroup).parents(".input-group");

            if ($(ctl).is(':checked')) {
                targetGroup.show();
            } else {
                targetGroup.hide();

            }

        }

    }

    if (num_logs > 1) {
        $(".drag-handle").show();
        $(".split-checkbox:gt(0)").show();

    } else {
        $(".drag-handle").hide();
        $(".split-checkbox").hide();
    }

};

var add_log = function (logline) {
    // console.log("adding");

    var newLog = $("#logformlinetemplate").clone();
    newLog[0].id = '';
    newLog[0].style.display = 'block';
    // console.log($(newLog[0]));

    if (logline) {
        $("#logsplit", newLog).prop("checked", logline.split);
        $("#loglabel", newLog).val(logline.label);
        $("#logcolor", newLog).val(logline.color);
        $("#logremote", newLog).prop("checked", logline.remote);
        $("#logssh", newLog).val(logline.ssh);
        $("#logcomm", newLog).prop("checked", logline.comm);
        $("#logfile", newLog).val(logline.file);
    }

    $(".logsplit", newLog).bootstrapSwitch({
        onText: "Split",
        offText: "Merge"
    });

    $(".logremote", newLog).bootstrapSwitch({
        onText: "Remote",
        offText: "Local"
    });

    $(".logcomm", newLog).bootstrapSwitch({
        onText: "Command",
        offText: "File"
    });

    $(".addbutton", newLog).click(function (e) {
        e.preventDefault();
        add_log();
    });


    newLog.find("*").each(function (idx, node) {
        // console.log(idx, node);

        if (node.id) {
            node.id = node.id + num_logs
        }

        if (node.htmlFor) {
            node.htmlFor = node.htmlFor + num_logs
        }

    });

    newLog.attr("data-group", num_logs);

    newLog.appendTo('#builder');
    num_logs++;

    newLog.change(function (e) {
        update(e);
    });

    newLog.change();

};

var parse_query = function () {
    var data = getParameterByName('d');

    if (data) {
        var json_string = LZString.decompressFromEncodedURIComponent(data);
        // console.log(json_string);

        var temp_log_structure = JSON.parse(json_string);
        $("#description").val(temp_log_structure.desc);
        $("#markinterval").val(temp_log_structure.mark);

        for (var i = 0; i < temp_log_structure.lines.length; i++) {
            var log = temp_log_structure.lines[i];

            add_log(log);
        }

        log_structure = temp_log_structure;
    } else {
        reset();
    }

};

var reset = function() {
    log_structure = {
        'v': 1
    };
    num_logs = 0;

    $("#description").val("");
    $("#markinterval").val(0);
    $("#builder .loggroup").remove();
    add_log();


};

var getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return results[2];
};

$(document).ready(function () {

    console.log("ready!");

    $.fn.bootstrapSwitch.defaults.size = 'small';
    $.fn.bootstrapSwitch.defaults.onColor = 'info';
    $.fn.bootstrapSwitch.defaults.offColor = 'success';
    $.fn.bootstrapSwitch.defaults.onSwitchChange = function(evt, state) { update(evt)};

    parse_query();


    $("#global-options").change(function (e) { update(e); });

    $("#resetbutton").click(function (e) {
        e.preventDefault();
        reset();
    });

    new Clipboard('#copybutton');

});

