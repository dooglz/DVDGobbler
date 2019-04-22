
function Startup(){

    $("#zapcookies").click(()=>{
        $.get( "./zapCookies");
    });

 $("#addBtn").click(()=>{
    let tr = $("<tr></tr>");
    let ipt = $('<input type="text" name="barcode" value=5035822416499>"');
    tr.append($('<td>').append(ipt));

    let result1 =  $('<span>');
    tr.append($('<td>').append(result1));
    let result2 =  $('<span>');
    tr.append($('<td>').append(result2));
    let result3 =  $('<span>');
    tr.append($('<td>').append(result3));

    let btn = $('<button type="button" id="addBtn">Check Price</button>');
    btn.click(()=>{
        console.log("yo:",ipt.val());
        zapReq(ipt.val(), (res)=>{
            result1.text(res.type);
            result2.text(res.title);
            result3.text(res.price);
        });
    });
    tr.append($('<td>').append(btn));

    let newrow = $('#maintable tr:last').after(tr);
 });
}

// "origin": "https://zapper.co.uk",


function zapReq(barcode, handler){
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "/zap",
        "method": "GET",
        "data": "barcode=5035822416499"
    };
          
    $.ajax(settings).done(function (response) {
        console.log(response);
        handler(response);
      });
}

$( document ).ready(Startup());
