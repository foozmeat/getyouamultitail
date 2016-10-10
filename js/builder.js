"use strict";

var num_logs = 0;

var log_structure = {
    'v': 1,
    'encoded': '',
    'lines': []
};

var compile_logs = function () {

    $('#builder').children().each(function (idx, div) {

        var logformline = $(div);
        var log_dict = {};

        log_dict.label = logformline.find("#loglabel" + idx).val();
        log_dict.color = logformline.find("#logcolor" + idx).val();

        log_dict.file = logformline.find("#logfile" + idx).val();
        log_dict.ssh = logformline.find("#logssh" + idx).val();

        log_dict.split = logformline.find("#logsplit" + idx).is(':checked');
        log_dict.remote = logformline.find("#logremote" + idx).is(':checked');
        log_dict.comm = logformline.find("#logcomm" + idx).is(':checked');

        log_structure.lines[idx] = log_dict;
    });

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
    console.log(json.length, json);

    var compressed = LZString.compressToEncodedURIComponent(json);
    console.log(compressed.length, compressed);

    log_structure.encoded = compressed;
    return log_structure;
};

var script_link = function () {
    return sprintf("%s//%s%s?d=%s", document.location.protocol, document.location.hostname, document.location.pathname, log_structure.encoded)

};

var create_command = function () {

    compile_logs();

    var base_command = "#!/usr/bin/env bash\n";
    base_command += "# Made with \"Get you a multitail\"\n";
    base_command += sprintf("# %s\n\n", script_link());
    base_command += "multitail -m 0 ";

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
            if (log.remote && !log.comm) {

                log_commands += log.split ? "-l " : "-L ";
                log_commands += sprintf("'ssh %s \"tail -q -f %s\"' ", log.ssh, log.file);

            } else if (log.remote && log.comm) {
                log_commands += log.split ? "-l " : "-L ";
                log_commands += sprintf("'ssh %s \"%s\"' ", log.ssh, log.file);

            } else if (!log.remote && !log.comm) {
                log_commands += log.split ? "-i " : "-I ";
                log_commands += sprintf('%s ', log.file);

            } else if (!log.remote && log.comm) {
                log_commands += log.split ? "-l " : "-L ";
                log_commands += sprintf('"%s" ', log.file);

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
        var ctl = evt.target;
        var loggroup = $(evt.currentTarget);
        var datagroup = loggroup.attr("data-group");

        // console.log(ctl);
        // console.log(loggroup);
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
};

var add_log = function (logline) {
    // console.log("adding");

    var newLog = $("#logformlinetemplate").clone();
    newLog[0].id = '';
    newLog[0].style.display = 'block';
    // console.log($(newLog[0]));

    if (logline) {
        $("#loglabel", newLog).val(logline.label);
        $("#logcolor", newLog).val(logline.color);
        $("#logssh", newLog).val(logline.ssh);
        $("#logfile", newLog).val(logline.file);
        $("#logsplit", newLog).prop("checked", logline.split);
        $("#logremote", newLog).prop("checked", logline.remote);
        $("#logcomm", newLog).prop("checked", logline.comm);
    }

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

        log_structure = JSON.parse(json_string);

        for (var i = 0; i < log_structure.lines.length; i++) {
            var log = log_structure.lines[i];

            add_log(log);
        }

    } else {
        add_log();
    }

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

    parse_query();

    $("#addbutton").click(function (e) {
        e.preventDefault();
        add_log();
    });

    $("input :checkbox").bootstrapSwitch();

    new Clipboard('#copybutton');
});

