var formatDate = function (originalDate) {
    if (window.moment && moment(originalDate).isValid()) {
        var nowDtTime = moment.utc();
        var feedDateTime = moment.unix(originalDate);

        var diffSec = nowDtTime.diff(feedDateTime, 'seconds');
        var retrunVal = '';


        if (diffSec < 1) {
            return "just now";
        }

        if (diffSec < 60) {
            if (diffSec === 1) {
                return diffSec + ' sec ago';
            } else {
                return diffSec + ' secs ago';
            }
        }


        //Difference greater then 60 secs, convert it to minutes
        var diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
            if (diffMin === 1) {
                return diffMin + ' min ago';
            } else {
                return diffMin + ' mins ago';
            }
        }

        //Difference is greater than 60 minutes
        var diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) {
            if (diffHour === 1)
                return diffHour + ' hour ago';
            else
                return diffHour + ' hours ago';
        }

        //Difference is greater than 24 hours, convert it to days
        var diffDay = Math.floor(diffHour / 24);
        if (diffDay < 8) {
            if (diffDay === 1) {
                return diffDay + ' day ago';
            } else {
                return diffDay + ' days ago';
            }
        }

        //Difference is more than 30 days, send date as it is
        return feedDateTime.local().format('DD MMM YYYY');
    } else
        return '';
};

var localDate = function (originalDate) {
    if (window.moment && moment(originalDate).isValid()) {
        var feedDateTime = moment.unix(originalDate);

        return feedDateTime.local().format('DD-MMM-YYYY hh:mm A');
    }
};

Handlebars.registerHelper("hbPrettyDate", function (datetime) {

    var formattedDate = formatDate(datetime);
    if (formattedDate == '')
        formattedDate = '-- no activity --';
    return formattedDate;
});

Handlebars.registerHelper("hbLocalDate", function (datetime) {
    return localDate(datetime);
});

Handlebars.registerHelper('equal', function (lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
    if (lvalue != rvalue) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});