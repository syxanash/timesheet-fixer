(function () {
    "use strict";

    function loadScript(url, callback) {
        let alreadyExists = false;

        // check if library has already been included in the header

        let scriptsTag = document.getElementsByTagName("script");
        for (let i = 0; i < scriptsTag.length; i++) {
            if(scriptsTag[i].getAttribute("src") == url) {
                alreadyExists = true;
            }
        }

        if (alreadyExists) {
            // remove previously created notifications and execute the callback
            $(".notifyjs-wrapper").trigger('notify-hide');

            if (!!callback)
                callback();
        } else {
            // include the js library for notifications and the run the callback
            let script = document.createElement("script");
            script.type = "text/javascript";

            if (script.readyState) { //IE
                script.onreadystatechange = function () {
                    if (script.readyState == "loaded" || script.readyState == "complete") {
                        script.onreadystatechange = null;
                        callback();
                    }
                };
            } else { //Others
                script.onload = function () {
                    if (!!callback)
                        callback();
                };
            }

            script.src = url;
            document.getElementsByTagName("head")[0].appendChild(script);
        }
    }

    if (window.location.hostname != "URL TO TIMESHEET WEB APPLICATION HERE :D") {
        alert("YOU ARE NOT USING TIMESHEET!");

        return;
    }

    loadScript("https://cdnjs.cloudflare.com/ajax/libs/notify/0.4.2/notify.min.js", function () {
        main();
    });
})();

function main() {
    function notify(msg, type, position) {
        $.notify(msg, {
            autoHide: false,
            clickToHide: true,
            className: type,
            globalPosition: position
        });
    }
    
    function decDay(dateObj) {
        // check if day is part of the weekend
        if (dateObj.getDay() == 0) { // sunday go to friday
            dateObj.setDate(dateObj.getDate()-2);
        } else if (dateObj.getDay() == 1) { // if monday go to friday
            dateObj.setDate(dateObj.getDate()-3);
        } else {
            dateObj.setDate(dateObj.getDate()-1);
        }
    }

    function getDateObject(dateString) {
        let temp = dateString.split("/");
        return new Date(temp[2], parseInt(temp[1])-1, temp[0]);
    }

    function getDateString(dateObj) {
        let tempDateObj = {
            year: dateObj.getFullYear(),
            month: ((dateObj.getMonth()+1) < 10 ? "0" + (dateObj.getMonth()+1) : (dateObj.getMonth()+1)),
            day: (dateObj.getDate() < 10 ? "0" + dateObj.getDate() : dateObj.getDate())
        };

        return tempDateObj.day + "/" + tempDateObj.month + "/" + tempDateObj.year;
    }

    // INITIALIZE MAIN SCRIPT VARIABLES ----------------------------------------

    const VERSION_NUMBER = "1.0.0";
    const TOTAL_MINUTES = 750;
    const CURRENT_DATE_STR = getDateString(new Date());

    let isPageClosed = $("#editTable > tbody").children().length == 0;
    let mainDate = "";
    let datesFound = [];
    let expectedDate = null;
    let minutesSum = 0;
    let tempDiv = null;
    let isSheetCorrect = true;
    let foundCurrentDate = false;

    // SEND YOUR PRIVATE INFO TO CIA -------------------------------------------

    let counterVer = 0;

    if ($('body').find("#easterCheck").length == 0)
        $('body').append('<span id="easterCheck" value="false"></span>')

    $(document).keypress(function(event){
        let userInput = event.which;

        if (userInput === 54 && counterVer == 2 &&
            $('#easterCheck').attr('value') === "false") {
            notify("TIMESHEET FIXER " + VERSION_NUMBER + "\nMade with ❤ by Simone", "info", "bottom left");
            counterVer++;

            $('#easterCheck').attr('value', 'true');
        }

        if (userInput === 54 && counterVer < 2)
            counterVer++;
    });

    // make first checks to see whether the page is valid

    if ($("#mainTable > tbody").children().length == 0) {
        notify("This page of Timesheet is empty", "info", "top center");

        return;
    }

    // CHECKING MINUTES --------------------------------------------------------

    // iterate over each record in timesheet page
    $("#mainTable > tbody > tr").each(function() {
        let currentDiv = $(this);
        let tempDate = currentDiv.find(".date").html();
        let durationDiv = currentDiv.find(".duration");

        let tempMin = durationDiv.html();

        // add for each row of the main timesheet table the duration
        // displayed as hours and minutes
        if (isFinite(String(tempMin))) {
            let totMinutes = (tempMin / 60).toFixed(2);
            let hours = Math.floor(totMinutes);
            let minutes = ((totMinutes-hours)*60).toFixed();

            if (hours === 0) {
                durationDiv.append(" <i>minutes</i>");
            } else {
                durationDiv.append("<br><i>(" + hours + " hour" +
                    (hours !== 1 ? "s" : "") + // the devil is in the details
                    (minutes !== "0" ? " " + minutes + " minutes" : "") + ")</i>");
            }
        }

        // start to check if the sum of minutes is correct
        if (mainDate == "" || mainDate != tempDate) {
            if (minutesSum != TOTAL_MINUTES && mainDate != "") {
                let remainingMin = TOTAL_MINUTES - minutesSum;

                if (remainingMin > 0) {
                    notify("Hey! something's wrong with: " + mainDate +
                        "\nyou have " + minutesSum +
                        " minutes registered\nbut you need " + remainingMin + " more minutes..."
                        , "error", "top right");

                    tempDiv.css("color", "red");

                    isSheetCorrect = false;
                } else {
                    notify("You have " + (remainingMin*-1) + " extra minutes for " + mainDate, "info", "top right");

                    tempDiv.css("color", "blue");
                }
            }

            tempDiv = currentDiv;
            mainDate = tempDate;
            minutesSum = 0;
            
            // check if date is greater than current date in this case warn
            // the user and highlight the date
            if (getDateObject(mainDate) > (new Date())) {
                currentDiv.find(".date").css("color", "blue");
                currentDiv.find(".date").css("font-weight", "bold");

                notify("A date greater than the current day was found: " + mainDate +
                    "\nyou sure you wanted to insert a record for a future day?", "info", "top right");
            } else {
                // otherwise push dates in an array which will be used
                // to check the gaps between dates
                datesFound.push(mainDate);
            }
        }

        if (mainDate == CURRENT_DATE_STR)
            foundCurrentDate = true;

        minutesSum += parseInt(tempMin);
    });

    // check if last element found in timesheet is correct
    if (minutesSum != TOTAL_MINUTES) {
        let remainingMin = TOTAL_MINUTES - minutesSum;
        
        if (remainingMin > 0) {
            notify("Hey! something's wrong with: " + mainDate +
                "\nyou have " + minutesSum +
                " minutes registered\nbut you need " + remainingMin + " more minutes..."
                , "error", "top right");

            tempDiv.css("color", "red");

            isSheetCorrect = false;
        } else {
            notify("You have " + (remainingMin*-1) + " extra minutes for " + mainDate, "info", "top right");

            tempDiv.css("color", "blue");
        }
    }

    // CHECKING GAPS BETWEEN DAYS ----------------------------------------------

    // get the range of dates of the records at the beginning of the html page
    let recordsDateRange = {
        start: $("#periodLabel > i").html().split(" - ")[0],
        end: $("#periodLabel > i").html().split(" - ")[1]
    };

    let firstWorkingDay = getDateObject(recordsDateRange.start);

    while(firstWorkingDay != null && (firstWorkingDay.getDay() == 6 || firstWorkingDay.getDay() == 0)) {
        firstWorkingDay.setDate(firstWorkingDay.getDate() + 1);
    }

    // check if timesheet page is closed, if true then get
    // the first day recorded otherwise get the current day
    if (isPageClosed) {
        expectedDate = getDateObject(datesFound[0]);
    } else {
        expectedDate = new Date();

        // if current date wasn't found is useless to notify the user
        // again for the current date missing
        if (!foundCurrentDate)
            decDay(expectedDate);
    }

    // look for every date recorded on the page and gradually decrement the day
    // until we reach the first working day of the month
    for(let counter = 0; expectedDate >= firstWorkingDay;) {
        // if the dates recorded on the page haven't finished
        // look for gaps, otherwise this means that there are gaps from the
        // first day of the month to last date recorded by the user
        if (counter < datesFound.length) {
            // if two dates are different decrement the expected date until we reach
            // the actual date registered by the user
            while(datesFound[counter] != getDateString(expectedDate)) {
                notify("Missing day on: " + getDateString(expectedDate), "warn", "top right");
                isSheetCorrect = false;

                decDay(expectedDate);
            }

            counter++;
        } else {
            notify("Missing day on: " + getDateString(expectedDate), "warn", "top right");
            isSheetCorrect = false;
        }

        decDay(expectedDate);
    }

    // CHECK CURRENT DATE ------------------------------------------------------

    // if page doesn't contain the inputs for editing the timesheet values
    // and the current date wasn't found in the records then notify the user
    
    if (!foundCurrentDate && !isPageClosed) {
        notify("You forgot to fill Timesheet for today!", "error", "top right");

        let dateDiv = $("#date");
        dateDiv.val(CURRENT_DATE_STR);
        dateDiv.css("color", "red");
        dateDiv.css("font-weight", "bold");

        isSheetCorrect = false;
    }

    // FINAL MESSAGE -----------------------------------------------------------

    if (isSheetCorrect)
        notify("Dear coworker,\nthis page of Timesheet IS JUST PERFECT!", "success", "top center");
}
