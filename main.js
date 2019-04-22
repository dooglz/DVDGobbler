
function Startup() {
    $("#zapcookies").click(() => {
        $.get("./zapCookies", (data) => {
            $("#zapcookspan").text(data);
        });
    });
    $("#sheetbtn").click(() => {
        $.get("./gsheets");
    });

    $("#addBtn").click(() => {
        let tr = $("<tr></tr>");
        let ipt = $('<input type="text" name="barcode" value=7321900180207>"');
        tr.append($('<td>').append(ipt));

        let ZAP_ID = $('<span>');
        tr.append($('<td>').append(ZAP_ID));
        let ZAP_Price = $('<span>');
        tr.append($('<td>').append(ZAP_Price));
        let MAG_ID = $('<span>');
        tr.append($('<td>').append(MAG_ID));
        let MAG_Price = $('<span>');
        tr.append($('<td>').append(MAG_Price));

        let ZAPBtn = $('<button type="button" id="addBtn1">ZAP</button>');
        ZAPBtn.click(() => {
            console.log("yo:", ipt.val());
            ZAPBtn.attr("disabled", true);
            zapReq(ipt.val(), (res) => {
                ZAPBtn.attr("disabled", false);
                if (res.error) {
                    ZAP_ID.text("error");
                    ZAP_Price.text("error");
                } else {
                    ZAP_ID.text(res.title + " " + res.type);
                    ZAP_Price.text(res.price);
                }
            });
        });
        let MAGBtn = $('<button type="button" id="addBtn2">MAG</button>');
        MAGBtn.click(() => {
            console.log("yo:", ipt.val());
            MAGBtn.attr("disabled", true);
            magReq(ipt.val(), (res) => {
                MAGBtn.attr("disabled", false);
                if (res.error) {
                    MAG_ID.text("error");
                    MAG_Price.text("error");
                } else {
                    MAG_ID.text(res.title);
                    MAG_Price.text(res.price);
                }
            });
        });
        let Buttons = $('<td>');
        Buttons.append(ZAPBtn);
        Buttons.append(MAGBtn);
        tr.append(Buttons);
        $('#maintable tr:last').after(tr);
    });
}



function zapReq(barcode, handler) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "/zap",
        "method": "GET",
        "data": "barcode=" + barcode
    };

    $.ajax(settings).done(function (response) {
        console.log(response);
        handler(response);
    });
}


function magReq(barcode, handler) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "/mag",
        "method": "GET",
        "data": "barcode=" + barcode
    };

    $.ajax(settings).done(function (response) {
        console.log(response);
        handler(response);
    });
}

$(document).ready(Startup());
