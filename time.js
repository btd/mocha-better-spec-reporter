function formatTime(ms) {
    var time = [];
    var days = Math.floor(ms / 1000 / 60 / 60 / 24);
    if(days >= 1) {
        time.push(days + 'd');
        ms -= days * (1000 * 60 * 60 * 24);
    }
    var hours = Math.floor(ms / 1000 / 60 / 60);
    if(hours >= 1) {
        time.push(hours + 'h');
        ms -= hours * (1000 * 60 * 60);
    }
    var minutes = Math.floor(ms / 1000 / 60);
    if(minutes >= 1) {
        time.push(minutes + 'm');
        ms -= minutes * (1000 * 60);
    }
    var seconds = Math.floor(ms / 1000);
    if(seconds >= 1) {
        time.push(seconds + 's');
        ms -= seconds * (1000);
    }
    if(ms >= 1) {
        time.push(ms + 'ms');
    }
    return time.join(' ');
}

exports.formatTime = formatTime;