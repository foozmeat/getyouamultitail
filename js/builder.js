"use strict";


var log_structure = {};
var log_row_id = 0;

var num_logs = function() {
    return $("#builder .loggroup").length;
};

var compile_logs = function() {

    log_structure.l = [];

    $('#builder .loggroup').each(function(i, div) {

        var logformline = $(div);
        var log_dict = {};
        var idx = logformline.attr("data-group");

        var logfile = logformline.find("#logpath" + idx);

        log_dict.label = logformline.find("#loglabel" + idx).val();
        log_dict.color = logformline.find("input[name=logcolor" + idx + "]:checked").val();

        log_dict.file = logfile.val();
        log_dict.ssh = logformline.find("#logssh" + idx).val();

        log_dict.split = logformline.find("#logsplitradio" + idx + ":checked").val() == 1;

        log_dict.remote = logformline.find("input[name=loglocalremote" + idx + "]:checked").val() == 1;

        log_dict.comm = logformline.find("input[name=logfilecomm" + idx + "]:checked").val() == 1;

        log_dict.commref = parseInt(logformline.find("#logcommref" + idx).val());
        $("#logint" + idx).text(log_dict.commref);

        log_dict.highfilt = logformline.find("input[name=loghighfilt" + idx + "]:checked").val() == 1;

        log_dict.filter = logformline.find("#logfilterregex" + idx).val();

        log_structure.l[i] = log_dict;

    });

    delete log_structure.desc;
    if ($("#description").val()) {
        log_structure.desc = $("#description").val();
    }

    delete log_structure.vh;
    var vh_val = $("input[name=splitdir]:checked").val() == 'vertical';

    if (vh_val) {
        log_structure.vh = vh_val;
    }

    delete log_structure.m;
    log_structure.m = parseInt($("#markinterval").val());
    $('#markint').text(log_structure.m);

    // Get rid of any empty keys to save space
    for (var i = 0; i < log_structure.l.length; i++) {
        var log = log_structure.l[i];

        $.each(log, function(key, value) {
            if (!log[key]) {
                delete log[key];
            }
        });
    }

    delete log_structure.encoded;

    var json = JSON.stringify(log_structure);
    console.log(json);

    var compressed = LZString.compressToEncodedURIComponent(json);
    // console.log(compressed.length, compressed);

    log_structure.encoded = compressed;
    return log_structure;
};

var script_link = function() {
    return sprintf("%s//%s%s?d=%s", document.location.protocol, document.location.hostname, document.location.pathname, log_structure.encoded);
};

var create_command = function() {

    compile_logs();

    var base_command = "#!/usr/bin/env bash\n\n";
    base_command += "# Made with \"Get you a multitail\"\n";
    base_command += sprintf("# %s\n\n", script_link());

    if (log_structure.desc) {
        base_command += sprintf("# %s\n\n", log_structure.desc);
    }

    base_command += "multitail -m 0 ";

    if (log_structure.m !== 0) {
        base_command += sprintf("--mark-interval %i ", log_structure.m);
    }

    if (log_structure.vh) {

        var split_count = 1; // The first log counts as a split
        for (var i = 0; i < log_structure.l.length; i++) {
            if (log_structure.l[i].split) {
                split_count++;
            }
        }
        if (split_count > 1) {
            base_command += sprintf("-s %i ", split_count);
        }
    }

    var all_log_commands = "";

    for (var j = 0; j < log_structure.l.length; j++) {

        var log = log_structure.l[j];
        var log_commands = "";

        if (log.label) {
            log_commands += sprintf("--label '[%s] ' ", log.label);
        }

        if (log.color) {
            log_commands += sprintf("-ci %s ", log.color);
        }

        if (log.filter) {

            if (log.highfilt) {
                log_commands += "-e ";
            } else {
                log_commands += "-ec ";
            }

            log_commands += sprintf("'%s' ", log.filter);

        }

        if (log.comm && log.commref > 0) {
            log_commands += sprintf("-r %i ", log.commref);
        }

        if (log.file) {

            if (!log.remote && !log.comm) {
                log_commands += log.split ? "-i " : "-I ";
            } else {
                log_commands += log.split ? "-l " : "-L ";
            }

            if (log.remote && !log.comm) {
                log_commands += sprintf("'ssh %s \"tail -q -f %s\"' ", log.ssh, log.file);

            } else if (log.remote && log.comm) {
                log_commands += sprintf("'ssh %s \"%s\"' ", log.ssh, log.file);

            } else if (!log.remote) {
                log_commands += sprintf("%s ", log.file);

            }

        }

        if (log.file) {
            all_log_commands += log_commands;
        }

    }

    if (all_log_commands !== "") {
        return base_command + all_log_commands;
    } else {
        return "";
    }

};

var update = function(evt) {

    update_log_group(evt);
    $('#result').text(create_command());
    $('#link').data("url", script_link());

    // $('.twitter-share-button').attr("data-url", script_link());
};

var delete_log = function(evt) {
    if (evt) {

        evt = $(evt)[0];
        var loggroup = $(evt.currentTarget).parents(".loggroup");

        loggroup.remove();

        update();
    }
};

var update_log_group = function(evt) {
    if (evt) {

        evt = $(evt)[0];
        var targetGroup;
        var loggroup = $(evt.currentTarget);

        if (loggroup.is("input")) {
            loggroup = $(evt.currentTarget).parents(".loggroup");
        }

        var ctl = evt.target;
        var datagroup = loggroup.data("group");

        if (ctl.name == "loglocalremote" + datagroup) {

            targetGroup = $("#logssh" + datagroup);

            if ($(ctl).val() == 1) {
                targetGroup.prop('disabled', false);
            } else {
                targetGroup.prop('disabled', true);
            }

        } else if (ctl.name == "logfilecomm" + datagroup) {

            targetGroup = $("#logcommrefgroup" + datagroup);

            if ($(ctl).val() == 1) {
                targetGroup.prop('disabled', false);
            } else {
                targetGroup.prop('disabled', true);
            }

        } else if (ctl.name == "logsplit" + datagroup) {
            targetGroup = $(ctl).parents(".loggroup");

            if ($(ctl).val() == 1) {
                targetGroup.addClass("splitlog");
            } else {
                targetGroup.removeClass("splitlog");
            }

        } else if (ctl.name == "logcolor" + datagroup) {

            targetGroup = $(ctl).parents(".loggroup");
            targetGroup.attr("data-color", $(ctl).val());

        } else if (ctl.id == "loglabel" + datagroup) {
            $("#title" + datagroup).text($(ctl).val());
        }
    }

    update_controls();
};

var update_controls = function() {
    if (num_logs() > 1) {
        $(".deletebutton").show();

        // $("#builder").sortable("enable");

    } else {
        $(".deletebutton").hide();

        // $("#builder").sortable("disable");
    }

    $("#builder .addbuttondiv").hide();
    $("#builder .addbuttondiv").last().show();

};

var dupe_log = function(evt) {
    if (evt) {

        evt = $(evt)[0];
        var loggroup = $(evt.currentTarget).parents(".loggroup");
        var index = $("#builder .loggroup").index(loggroup);
        var log_data = log_structure.l[index];

        add_log(log_data);
    }
};

var toggle_log = function(evt) {
    if (evt) {

        var loggroup = $(evt.target).parents("section");

        if (loggroup.attr('data-state') === 'expanded') {
            loggroup.attr('data-state', 'collapsed');
            $(evt.target).text('Edit');

        } else {
            loggroup.attr('data-state', 'expanded');
            $(evt.target).text('Collapse');
        }
    }

};

var add_log = function(logline) {

    var newLog = $("#logformlinetemplate").clone();
    newLog[0].id = '';
    newLog[0].style.display = 'block';

    if (logline) {

        if (logline.split) {
            $("#logsplitradio", newLog).prop("checked", logline.split);
            newLog.addClass("splitlog");
        }

        $("#loglabel", newLog).val(logline.label);
        $("#title", newLog).text(logline.label);

        if (!logline.color) {
            logline.color = 'white';
        }

        $("#logcolor-" + logline.color, newLog).prop('checked', true);

        newLog.attr("data-color", logline.color);

        $("input[name=loglocalremote][value=1]", newLog).prop("checked", logline.remote);

        $("#logssh", newLog).val(logline.ssh);

        if (logline.remote) {
            $("#logssh", newLog).prop('disabled', false);
        }

        $("#logcomm", newLog).prop("checked", logline.comm);

        if (logline.comm) {
            $("#logcommrefgroup", newLog).prop('disabled', false);
        }

        if (logline.commref) {
            $("#logcommref", newLog).val(logline.commref);
        }

        $("#logpath", newLog).val(logline.file);

        $("#logfilterregex", newLog).val(logline.filter);

        $("#logfilter", newLog).prop("checked", logline.highfilt);

    }

    $(".addbutton", newLog).click(function(e) {
        e.preventDefault();
        add_log();
    });

    $(".deletebutton", newLog).click(function(e) {
        e.preventDefault();
        delete_log(e);
    });

    $(".dupebutton", newLog).click(function(e) {
        e.preventDefault();
        dupe_log(e);
    });

    $(".editbutton", newLog).click(function(evt) {
        evt.preventDefault();
        toggle_log(evt);
    });

    newLog.find("*").each(function(idx, node) {

        if (node.id) {
            node.id = node.id + log_row_id;
        }

        if (node.htmlFor) {
            node.htmlFor = node.htmlFor + log_row_id;
        }

        if (node.name) {
            node.name = node.name + log_row_id;
        }

    });

    newLog.attr("data-group", log_row_id);

    newLog.appendTo('#builder');
    log_row_id++;

    newLog.change(function(e) {
        update(e);
    });

    newLog.change();

};

var parse_query = function() {
    var data = getParameterByName('d');

    if (data) {
        var json_string = LZString.decompressFromEncodedURIComponent(data);
        console.log("Parsed", json_string);

        var temp_log_structure = JSON.parse(json_string);
        $("#description").val(temp_log_structure.desc);
        $("#markinterval").val(temp_log_structure.m);
        $("#splitdir-v").prop("checked", temp_log_structure.vh);

        for (var i = 0; i < temp_log_structure.l.length; i++) {
            var log = temp_log_structure.l[i];

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

    $("#description").val("");
    $("#markinterval").val(0);
    $("#builder .loggroup").remove();

    add_log();

};

var getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return results[2];
};

$(document).ready(function() {

    console.log("ready!");

    // var now = new Date();
    // if (now.getHours() > 18 || now.getHours() < 4 ) {
        // $('body').addClass('dark');
    // }

    // $("#builder").sortable({
    //     items: "> .loggroup",
    //     opacity: 0.75,
    //     cursor: "move",
    //     axis: "y",
    //     stop: function(event, ui) {
    //         update(event);
    //     }
    //
    // });

    parse_query();

    $("#global-options").change(function(e) {
        update(e);
    });

    $("#resetbutton").click(function(e) {
        e.preventDefault();
        reset();
    });

    $("#link").click(function(e) {
        e.preventDefault();
        window.location = $("#link").data("url");

    });

    new Clipboard('#copybutton');

});
