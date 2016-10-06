
var compile_output = function () {

    var base_command = "#!/bin/env bash\n\n# Made with https://foozmeat.github.io/getyouamultitail/\n\nmultitail";

    var additional_commands = "";

    var numlines = $('#builder').length();

    $('#builder').each(function (idx, div) {

        var logformline = $(div);

        var log_label = logformline.find("#loglabel" + idx).val();

        if (log_label && log_label != "") {
            additional_commands += ' --label \'[' + log_label + ']\'';
        }

        var log_color = logformline.find("#logcolor" + idx).val();

        if (log_color && log_color != "") {
            additional_commands += ' -ci ' + log_color;
        }

        var log_file = logformline.find("#logfile" + idx).val();

        var log_ssh = logformline.find("#logssh" + idx).val();

        if (log_ssh && log_ssh != "") {
            additional_commands += ' -L ssh ' + log_ssh + ' "tail -n 0 -q -f ' + log_file + '"';

        } else if (log_file && log_file != "") {
            additional_commands += ' ' + log_file;

        }

        if (idx + 1 < numlines) {
            additional_commands += " \\ \n";
        }

    });

    if (additional_commands != "") {

        $('#result').text(base_command + additional_commands);
    }


};

$(document).ready(function () {

    console.log("ready!");
    compile_output();

    $("form :input").change(function () {
        compile_output();
    });


});

