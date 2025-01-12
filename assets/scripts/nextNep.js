"use strict";

const streams = [];
const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const streamUrl = "https://twitch.tv/neppienep";
const twitchClientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const twitchGqlUrl = "https://gql.twitch.tv/gql";
const preloadedArt = [];
let lastLive = null;
let today = new Date().getDay();
let currentArtIndex = 0;
let isAnimating = false;
let featuredArtTiming = 15;
let featuredArtTimer = 2; // start on 2 since the sliding animation takes 2 seconds
let pauseArtTimer = false;
let firstDateOfWeek = null;
let lastDateOfWeek = null;

class Stream {
    constructor(streamConfig) {
        const that = this;
        this.streamConfig = streamConfig;
        this.streamDate = new Date(streamConfig.time);
        this.weekDay = weekDays[this.streamDate.getUTCDay()];
        this.hideDate = false;
        this.live = false;
        if (this.streamDate >= firstDateOfWeek && this.streamDate <= lastDateOfWeek) {
            this.interval = setInterval(() => {
                that.intervalLoop();
            }, 1000);
            this.initElements();
            this.printTime(true);
        } else {
            this.standbyInterval = setInterval(() => {
                that.onStandby();
            }, 1000);
            this.onStandby();
        }
    }

    intervalLoop() {
        if (this.streamDate <= firstDateOfWeek || this.streamDate >= lastDateOfWeek) {
            const that = this;
            this.standbyInterval = setInterval(() => {
                that.onStandby();
            });
            this.onStandby();
            clearInterval(this.interval);
        } else {
            this.printTime(true);
        }
    }

    onStandby() {
        if (this.streamDate >= firstDateOfWeek && this.streamDate <= lastDateOfWeek) {
            const that = this;
            this.interval = setInterval(() => {
                that.intervalLoop();
            }, 1000);
            this.initElements();
            this.printTime(true);
            clearInterval(this.standbyInterval);
        }
    }

    initElements() {
        this.streamElement = document.createElement("div");
        this.streamElement.classList.add("nepClock-stream");

        this.streamConfig.layout.forEach((layoutConfig) => {
            switch(layoutConfig.type) {
                case 'title':
                    this.titleElement = document.createElement("h4");
                    this.titleElement.classList.add("nepClock-streamTitle");
                    if (layoutConfig.effect) {
                        let characters = layoutConfig.text.split("");
                        characters.forEach((letter) => {
                            if (letter !== " ") {
                                let spanElement = document.createElement("span");
                                spanElement.classList.add(layoutConfig.effect);
                                spanElement.innerHTML = letter;
                                this.titleElement.appendChild(spanElement);
                            } else {
                                this.titleElement.innerHTML += " ";
                            }
                        });
                    } else {
                        this.titleElement.innerHTML = layoutConfig.text;
                    }
                    this.streamElement.appendChild(this.titleElement);
                    break;
                case 'titleLogo':
                    this.titleElement = document.createElement("img");
                    this.titleElement.classList.add("nepClock-streamTitleImage");
                    this.titleElement.src = `./assets/images/titleimages/${layoutConfig.image}`;
                    if (layoutConfig.alignSelf) {
                        this.titleElement.style.alignSelf = layoutConfig.alignSelf;
                    }
                    if (layoutConfig.filter) {
                        this.titleElement.style.filter = layoutConfig.filter;
                    }
                    this.streamElement.appendChild(this.titleElement);
                    break;
                case 'titleLogoText':
                    this.titleElement = document.createElement("div");
                    this.titleElement.classList.add("nepClock-streamTitleImageText");
                    let titleImage = document.createElement("img");
                    titleImage.classList.add("nepClock-streamTitleImageText-image");
                    titleImage.src = `./assets/images/titleimages/${layoutConfig.image}`;
                    this.titleElement.appendChild(titleImage);
                    let titleText = document.createElement("h4");
                    titleText.classList.add("nepClock-streamTitleImageText-text");
                    titleText.innerHTML = layoutConfig.text;
                    this.titleElement.appendChild(titleText);
                    this.streamElement.appendChild(this.titleElement);
                    break;
                case 'lEmote':
                    let lEmoteElement = document.createElement("img");
                    lEmoteElement.classList.add("nepClock-emote-left");
                    if (layoutConfig.wide) {
                        lEmoteElement.classList.add("nepClock-wideEmote");
                    }
                    if (layoutConfig.big) {
                        lEmoteElement.classList.add("nepClock-bigEmote");
                    }
                    if (layoutConfig.reverse) {
                        lEmoteElement.classList.add("nepClock-reverseEmote");
                    }
                    lEmoteElement.src = `./assets/images/twitchemotes/${layoutConfig.image}`;
                    this.streamElement.appendChild(lEmoteElement);
                    break;
                case 'rEmote':
                    let rEmoteElement = document.createElement("img");
                    rEmoteElement.classList.add("nepClock-emote-right");
                    if (layoutConfig.wide) {
                        rEmoteElement.classList.add("nepClock-wideEmote");
                    }
                    if (layoutConfig.big) {
                        rEmoteElement.classList.add("nepClock-bigEmote");
                    }
                    if (layoutConfig.reverse) {
                        rEmoteElement.classList.add("nepClock-reverseEmote");
                    }
                    rEmoteElement.src = `./assets/images/twitchemotes/${layoutConfig.image}`;
                    this.streamElement.appendChild(rEmoteElement);
                    break;
                case 'comment':
                    let comment = document.createElement('div');
                    comment.classList.add("nepClock-streamComment");
                    comment.innerHTML = layoutConfig.text;
                    this.streamElement.appendChild(comment);
                    break;
                default:
                    break;
            }
        });

        if (this.streamConfig.hideDate) {
            this.hideDate = true;
        } 
        this.timeElement = document.createElement("div");
        this.timeElement.classList.add("nepClock-streamTime");

        let streamWrapper = document.createElement('div');
        streamWrapper.classList.add("nepClock-streamWrapper");
        if (this.streamConfig.discord) {
            streamWrapper.classList.add("nepClock-discordStream");
        }
        if (this.streamConfig.glitter) {
            streamWrapper.classList.add("nepClock-glitter");
        }
        if (this.streamConfig.canceled) {
            streamWrapper.classList.add("nepClock-canceledStream");
        }
        
        streamWrapper.appendChild(this.streamElement);
        document.querySelector("#nepClock-" + this.weekDay + " > .nepClock-weekDaySchedule > .nepClock-scheduleContent").appendChild(streamWrapper);
        this.streamElement.parentNode.insertBefore(this.timeElement, this.streamElement.nextSibling);
    }

    printTime(updateTimer) {
        if (this.hideDate) {
            return;
        }
        if (updateTimer) {
            this.updateTimer();
        }
        this.timeElement.innerHTML = this.timeStamp;
    }

    getHours(ms) {
        return Math.floor((ms % 86400000) / 3600000);
    }

    getMinutes(ms) {
        return Math.floor((ms % 3600000) / 60000);
    }

    getSeconds(ms) {
        return Math.floor((ms % 60000) / 1000);
    }

    formatClockNumber(number) {
        return number < 10 ? "0" + number.toString() : number;
    }

    getDigitalStreamStart() {
        return '<div class="nepClock-digitalTime">' + this.streamDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + '</div>';
    }

    getAnalogStreamStart() {
        let time = '<div class="nepClock-analogTime">' + this.streamDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + '</div>';

        return time.replace(':00', '');
    }

    getCombinedStartTime() {
        return this.getDigitalStreamStart() + this.getAnalogStreamStart();
    }

    updateTimer() {
        if (this.hideDate) {
            return;
        }
        const now = new Date();
        
        if (this.streamConfig?.canceled) {
            this.timeStamp = "<div class='nepClock-streamTime'>" + this.getCombinedStartTime() + "</div>";
        } else if (this.live && !this.streamConfig?.canceled) {
            const timeSince = now - lastLive;
            const h = this.formatClockNumber(this.getHours(timeSince));
            const m = this.formatClockNumber(this.getMinutes(timeSince));
            const s = this.formatClockNumber(this.getSeconds(timeSince));
        
            this.timeStamp = `<a href=${streamUrl}>[Started ${h}:${m}:${s} ago]</a>`;
        } else { 
            const timeLeft = this.streamDate - now;
            if (timeLeft < -1800000) {
                this.timeStamp = "<div class='nepClock-streamTime'>" + this.getCombinedStartTime() + "</div>";
            } else if (timeLeft < 0) {
                this.timeStamp = `<a href=${streamUrl}>[any minute now...]</a>` + "<div class='nepClock-realTime'>" + this.getCombinedStartTime() + "</div>";
            } else if (timeLeft < 86400000) {
                const h = this.formatClockNumber(this.getHours(timeLeft));
                const m = this.formatClockNumber(this.getMinutes(timeLeft));
                const s = this.formatClockNumber(this.getSeconds(timeLeft));

                this.timeStamp = "<div class='nepClock-countdown'>" + h + ":" + m + ":" + s + " </div><div class='nepClock-realTime'>" + this.getCombinedStartTime() + "</div>";
            } else {
                this.timeStamp = "<div class='nepClock-streamTime'>" + this.getCombinedStartTime() + "</div>";
            }
        }
    }
}

const updateToday = () => {
    const now = new Date();
    if (!document.querySelector(".nepClock-today")) {
        document.querySelector("#nepClock-" + weekDays[today]).classList.add("nepClock-today");
    }
    if (today !== now.getDay()) {
        document.querySelector(".nepClock-today").classList.remove("nepClock-today");
        document.querySelector("#nepClock-" + weekDays[now.getDay()]).classList.add("nepClock-today");
        today = now.getDay();
    }
};

const addWeekDates = () => {
    const now = new Date();

    let date = (new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() == 0 ? -6 : 1))));
    let monthStr = date.toLocaleString('en-US', { month: 'short' });
    monthStr = monthStr.slice(-1) === '.' ? monthStr.slice(0, -1) : monthStr; 
    document.querySelector("#nepClock-monday-date .nepClock-streamMonth").innerHTML = monthStr.toLowerCase();
    document.querySelector("#nepClock-monday-date .nepClock-streamDay").innerHTML = date.getDate();

    date = (new Date(now.setDate(now.getDate() - now.getDay() + 7)));
    monthStr = date.toLocaleString('en-US', { month: 'short' });
    monthStr = monthStr.slice(-1) === '.' ? monthStr.slice(0, -1) : monthStr; 
    document.querySelector("#nepClock-sunday-date .nepClock-streamMonth").innerHTML = monthStr.toLowerCase();
    document.querySelector("#nepClock-sunday-date .nepClock-streamDay").innerHTML = date.getDate();
};

const getFirstDateOfWeek = () => {
    const firstDate = new Date();
    firstDate.setHours(2, 0, 0);
    firstDate.setDate(firstDate.getDate() - firstDate.getDay() + (firstDate.getDay() == 0 ? -6 : 1));
    firstDateOfWeek = firstDate;
};

const getLastDateOfWeek = () => {
    const lastDate = new Date();
    lastDate.setHours(2, 0, 0);
    lastDate.setDate(lastDate.getDate() - lastDate.getDay() + (lastDate.getDay() == 0 ? 1 : 8));
    lastDateOfWeek = lastDate;
};

const updateFirstLastDates = () => {
    getFirstDateOfWeek();
    getLastDateOfWeek();
}

const checkNewWeek = () => {
    if (new Date() >= lastDateOfWeek || new Date() <= firstDateOfWeek) {
        updateFirstLastDates();
        document.querySelectorAll(".nepClock-scheduleContent").forEach((element) => {
            element.innerHTML = "";
        });
    }
}

const appTick = () => {
    updateToday();
    addWeekDates();
    // If the device cannot use a cursor, disable featuredArt slider
    featuredArtTimer += window.matchMedia("(any-pointer: coarse)").matches ? 0 : 1;
    if (featuredArtTimer >= featuredArtTiming && !pauseArtTimer) {
        document.querySelector("#nepClock-featuredArt > .arrow-right").click();
    }
};

const preloadImage = (index) => {
    if (!preloadedArt[index]) {
        const img = new Image();
        img.src = `./assets/images/featuredart/${featuredArtList[index].image}`;
        preloadedArt[index] = img;
    }
};

const checkImageLink = (imageLink) => {
    return imageLink === '-' || !imageLink ? 'javascript:void(0)' : imageLink;
}

const initFeaturedArt = () => {
    // Preload initial images
    preloadImage(currentArtIndex);
    preloadImage(featuredArtList.length - 1);
    preloadImage(currentArtIndex + 1);
    // Set the initial featured art without animation
    const featuredArt = featuredArtList[currentArtIndex];
    const aElements = document.querySelector("#nepClock-featuredArt").querySelectorAll("a");
    const artImage = aElements[0].children[0];
    artImage.src = preloadedArt[currentArtIndex].src;
    aElements[0].href = checkImageLink(featuredArt.imageLink);
    aElements[1].href = checkImageLink(featuredArt.artistLink);
    aElements[1].innerHTML = `art: ${featuredArt.artist}`;

    const updateFeaturedArt = (direction) => {
        if (isAnimating) return; // Prevent animation if one is already in progress
        isAnimating = true; // Set the animation flag to true

        const oldArt = artImage;
        const newArtIndex = (currentArtIndex + direction + featuredArtList.length) % featuredArtList.length;
        const newArt = preloadedArt[newArtIndex];

        // Preload the next image in the same direciton
        const preloadIndex = (newArtIndex + direction + featuredArtList.length) % featuredArtList.length;
        preloadImage(preloadIndex);

        // Set the appropriate classes for the animation direction
        if (direction === 1) {
            oldArt.className = "slide-out-left";
        } else {
            oldArt.className = "slide-out-right";
        }

        // Hide the old image before the slide-out animation completes
        setTimeout(() => {
            oldArt.style.visibility = "hidden"; // Hide the old image before animation completes
        }, 300); // Adjust this to be shorter than the duration of your slide-out animation

        // Wait for the slide-out animation to complete
        setTimeout(() => {
            oldArt.src = newArt.src;
            oldArt.style.visibility = "visible"; // Make the new image visible again
            if (direction === 1) {
                oldArt.className = "slide-in-left";
            } else {
                oldArt.className = "slide-in-right";
            }

            aElements[0].href = checkImageLink(featuredArtList[newArtIndex].imageLink);
            aElements[1].href = checkImageLink(featuredArtList[newArtIndex].artistLink);
            aElements[1].innerHTML = `art: ${featuredArtList[newArtIndex].artist}`

            // Wait for the slide-in animation to complete before resetting
            setTimeout(() => {
                oldArt.className = "";
                isAnimating = false; // Reset the animation flag
            }, 1000); // Adjust this to match the duration of your slide-in animation
        }, 500); // Adjust this to match the duration of your slide-out animation

        currentArtIndex = newArtIndex;
    };

    // Add event listeners to the arrow buttons
    document.querySelector("#nepClock-featuredArt > .arrow-left").addEventListener('click', () => {
        if (!isAnimating) {
            updateFeaturedArt(-1);
            featuredArtTimer = 0;
        } 
    });
    document.querySelector("#nepClock-featuredArt > .arrow-right").addEventListener('click', () => {
        if (!isAnimating) {
            updateFeaturedArt(1);
            featuredArtTimer = 0;
        }
    });

    document.querySelector("#nepClock-featuredArt").addEventListener('mouseover', () => {
        pauseArtTimer = true;
    })

    document.querySelector("#nepClock-featuredArt").addEventListener('mouseout', () => {
        pauseArtTimer = false;
    })
};

const setStreamLive = () => {
    const now = new Date();
    for(let i = streams.length - 1; i >= 0; i-=1) {
        if (now > streams[i].streamDate) {
            streams[i].live = true;
            streams[i].streamElement?.classList.add('nepClock-live');
            break;
        }
    }
}

const setAllStreamsOffline = () => {
    streams.forEach((stream) => {
        stream.live = false;
        stream.streamElement?.classList.remove('nepClock-live');
    });
};

const checkIfLive = async () => {
    const query = `query {
        user(login: "neppienep") {
            stream {
                createdAt
            }
        }
    }`;

    try {
        const response = await fetch(twitchGqlUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Client-Id": twitchClientId
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        if (data.data.user.stream?.createdAt && !lastLive) {
            lastLive = new Date(data.data.user.stream?.createdAt);

            setStreamLive();
        } else if (!data.data.user.stream?.createdAt) {
            lastLive = null;

            setAllStreamsOffline();
        }
    } catch (error) {
        console.error("Error checking stream status:", error);
    }
};

const startUp = () => {
    updateFirstLastDates();

    schedule.slice(0).forEach((stream) => {
        streams.push(new Stream(stream));
    });

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.querySelector("#nepClock-timeZone").innerHTML = timeZone;

    addWeekDates();
    initFeaturedArt();

    setInterval(checkNewWeek, 500);
    setInterval(appTick, 1000);
    setInterval(checkIfLive, 120000);
    appTick();
    checkIfLive();
};

startUp();
