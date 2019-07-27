var date = new Date();


console.log("Starting Better Twitter " + date.getTime());


var accessibleListRe = /accessible-list-\d+/;
var analyticsRe = new RegExp("https:\/\/t\.co\/.*");
var linkCheckedClass = "btchecked";


function getParent(element, layer) {
    if(element == null) {
        return null;
    }

    var currentElement = element;
    
    for(i = 0; i < layer; i++) {
        currentElement = currentElement.parentElement;
        if(currentElement == null) {
            return null;
        }
    }
    
    return currentElement;
}


function firstOf(array) {
    return array.length ? array[0] : null;
}


function findTweetsSection(context) {
    return getParent(firstOf([...context.getElementsByTagName("h1")].filter(function(element) {
        return accessibleListRe.exec(element.id) && element.textContent == "Your Home Timeline";
    })), 1);
}


function replaceLinks(context) {
    [...context.getElementsByTagName("a")].filter(function(link) {
        return !link.classList.contains(linkCheckedClass);
    }).forEach(function(link) {
        link.classList.add(linkCheckedClass);
        if(analyticsRe.exec(link.href) && link.title) {
            link.href = link.title;
        }
    });
}


function removePromotedTweets(context) {
    [...context.getElementsByTagName("article")].filter(function(tweet) {
        return [...tweet.getElementsByTagName("svg")].filter(function(svg) {
            return [...svg.parentElement.getElementsByTagName("span")].filter(function(span) {
                return span.textContent == "Promoted";
            }).length != 0;
        }).length != 0;
    }).forEach(function(promotedTweet) {
        getParent(promotedTweet, 4).style.backgroundColor = "green";
    });
}


function removeRightSidebar(context) {
    var spans = context.getElementsByTagName("span");
    spans.forEach(function(span) {
        if(span.innerHTML == "Trends for you") {
            var trendsContainer = getParent(span, 4);
            trendsContainer.style.display = "none";
            span.innerHTML = "Lorem ipsum!";
        }
    });
}


function addCustomCSS() {
    // var css = "div[aria-label=\"Timeline: Trending now\"] { display: none; }";
    var css = "div[data-testid=\"sidebarColumn\"] { display: none; } div[data-testid=\"primaryColumn\"] { max-width: 100%; } a[aria-label=\"Twitter\"] { display: none; }";
    var style = document.createElement("style");
    document.head.appendChild(style);
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
}


function runBetterTwitter(tweets) {
    replaceLinks(tweets);
    removePromotedTweets(tweets);

    var tweetObserver = new MutationObserver(function(mutationsList, observer) {
        console.log("Mutations at " + date.getTime());
        console.log(mutationsList);
        removePromotedTweets(tweets);
        replaceLinks(tweets);
        console.log("Mutations handled");
    });

    tweetObserver.observe(tweets, { attributes: false, childList: true, subtree: true });
}


addCustomCSS();
console.log("Custom CSS added");

var tweets = findTweetsSection(document);

if(tweets) {
    console.log("Tweet section found immediately");
    runBetterTwitter(tweets);
} else {
    var tweetsSectionLoadObserver = new MutationObserver(function(mutationsList, observer) {
        tweets = findTweetsSection(document);
        if(tweets) {
            console.log("Tweet section found on mutation, disconnecting observer");
            observer.disconnect();
            runBetterTwitter(tweets);
        } else {
            console.log("Tweet section not found on mutation");
        }
    });

    tweetsSectionLoadObserver.observe(document, { attributes: false, childList: true, subtree: true });
}

console.log("Better Twitter running " + date.getTime());
