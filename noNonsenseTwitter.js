var accessibleListRe = /accessible-list-\d+/;

var analyticsRe = new RegExp("https:\/\/t\.co\/.*");
var linkCheckedClass = "btchecked";

var photoLocationRe = /^\/.+\/status\/\d+\/photo\/\d+/;
var statusLocationRe = /^\/.+\/status\/\d+/;

var customCSS = `
    div[data-testid="sidebarColumn"] {
        display: none !important;
    }
    
    div[data-testid="primaryColumn"] {
        max-width: 100% !important;
    }
    
    a[aria-label="Twitter"] {
        display: none !important;
    }
`;


var currentLocation = "none";
var mutationObservers = [];


//Returns the parent of the element the specified number of layers up the DOM tree, where 1 would be the
//direct parent of the element.
function getParent(element, layer) {
    if(element === null) {
        return null;
    }

    var currentElement = element;
    
    for(i = 0; i < layer; i++) {
        currentElement = currentElement.parentElement;
        if(currentElement === null) {
            return null;
        }
    }
    
    return currentElement;
}


//Returns the first element of the array, or null if the array is empty.
function firstOf(array) {
    return array.length ? array[0] : null;
}


function findChild(context, childrenIndices) {
    var currentElement = context;

    for(i = 0; i < childrenIndices.length; i++) {
        if(currentElement === null) {
            return null;
        }

        if(childrenIndices[i] < currentElement.children.length) {
            currentElement = currentElement.children[childrenIndices[i]]
        }

        else {
            return null;
        }
    }

    return currentElement;
}


function pushMutationObserver(observer) {
    mutationObservers.push(observer);
}


function removeMutationObserver(observer) {
    var removeIndex = mutationObservers.indexOf(observer);
    if(removeIndex > -1) {
        observer.disconnect();
        mutationObservers.splice(removeIndex, 1);
    }
}


function clearMutationObservers() {
    mutationObservers.forEach(function(oldObserver) {
        oldObserver.disconnect();
    });

    mutationObservers = [];
}


//Run a task when an element is successfully found by the given function.
//If pageDependent is true, the mutation observer will be added to the global mutationObservers array.
function waitForElement(context, pageDependent, findElement, onFound) {
    var element = findElement(context);

    if(element) {
        onFound(element);
    }
    
    else {
        var mutationObserver = new MutationObserver(function(mutationsList, observer) {
            element = findElement(context);

            if(element) {
                if(pageDependent) {
                    removeMutationObserver(observer);
                } else {
                    observer.disconnect();
                }
                
                onFound(element);
            }
        });

        mutationObserver.observe(context, { attributes: false, childList: true, subtree: true });

        if(pageDependent) {
            pushMutationObserver(mutationObserver);
        }
    }
}


//Run a task when elements are successfully found by all of the given functions.
//If pageDependent is true, the mutation observer will be added to the global mutationObservers array.
function waitForElements(context, pageDependent, findElements, onFound) {
    var elements = findElements.map(function(findElement) { return findElement(context); });

    if(elements.includes(null)) {
        var mutationObserver = new MutationObserver(function(mutationsList, observer) {
            for(i = 0; i < elements.length; i++) {
                if(elements[i] === null) {
                    elements[i] = findElements[i](context);
                }
            }

            if(!elements.includes(null)) {
                if(pageDependent) {
                    removeMutationObserver(observer);
                } else {
                    observer.disconnect();
                }

                onFound(elements);
            }
        });

        mutationObserver.observe(context, { attributes: false, childList: true, subtree: true });

        if(pageDependent) {
            pushMutationObserver(mutationObserver);
        }
    }
    
    else {
        onFound(elements);
    }
}


function getLocation() {
    var pathName = window.location.pathname;
    if(pathName == "/home") { return "home"; }
    else if(pathName == "/explore") { return "explore"; }
    else if(pathName == "/notifications") { return "notifications"; }
    else if(pathName == "/messages") { return "messages-home"; }
    else if(pathName.startsWith("/messages")) { return "messages-read"; }
    else if(pathName == "/i/bookmarks") { return "bookmarks"; }
    else if(pathName == "/compose/tweet") { return "tweet"; }
    else if(pathName == "/search-advanced") { return "advanced-search"; }
    else if(pathName.startsWith("/search")) { return "search"; }
    else if(photoLocationRe.exec(pathName)) { return "photo"; }
    else if(statusLocationRe.exec(pathName)) { return "status"; }
    return pathName;
}


//Main static container — directly mutates on page change.
function findMainStaticContainer(context) {
    return firstOf([...context.getElementsByTagName("main")].filter(function(element) {
        return element.getAttribute("role") == "main";
    }));
}


//Searches the context element for the area where the tweet elements are added. Returns null if not found.
function findTweetsSection(context) {
    return getParent(firstOf([...context.getElementsByTagName("h1")].filter(function(element) {
        return accessibleListRe.exec(element.id) && element.textContent == "Your Home Timeline";
    })), 1);
}


//Searches the context element for the left sidebar. Returns null if not found.
function findLeftSidebar(context) {
    var sidebarContainer = firstOf([...context.getElementsByTagName("header")].filter(function(header) {
        return header.getAttribute("role") == "banner";
    }));

    if(!sidebarContainer) {
        return null;
    }

    var twitterButton = firstOf([...sidebarContainer.getElementsByTagName("a")].filter(function(link) {
        return link.getAttribute("aria-label") == "Twitter";
    }));

    return getParent(twitterButton, 3);
}


//Searches the context element for the right sidebar. Returns null if not found.
function findRightSidebar(context) {
    return firstOf([...context.getElementsByTagName("div")].filter(function(div) {
        return div.getAttribute("data-testid") == "sidebarColumn";
    }));
}


//Searches the context element for the search bar. Returns null if not found.
function findSearchBar(context) {
    return getParent(firstOf([...context.getElementsByTagName("form")].filter(function(form) {
        return form.getAttribute("role") == "search";
    })), 4);
}


function findComposeBox(context) {
    return getParent(firstOf([...context.getElementsByTagName("div")].filter(function(div) {
        return div.getAttribute("data-testid") == "toolBar";
    })), 4);
}


//Moves the search bar to the left sidebar.
function moveSearchBar(leftSidebar, searchBar) {
    var nav = firstOf([...leftSidebar.getElementsByTagName("nav")].filter(function(element) {
        return element.getAttribute("role") == "navigation";
    }));

    nav.insertBefore(searchBar, nav.children[0]);
    searchBar.style.width = nav.offsetWidth + "px";
    searchBar.style.position = "static";
}


//Finds all of the links within the context element which direct the user to Twitter analytics and have the actual
//destination in the title, and replaces the href with the actual destination, thus bypassing Twitter analytics.
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


//Searches the context for promoted tweets and sets their display to none.
function removePromotedTweets(context) {
    [...context.getElementsByTagName("article")].filter(function(tweet) {
        return [...tweet.getElementsByTagName("svg")].filter(function(svg) {
            return [...svg.parentElement.getElementsByTagName("span")].filter(function(span) {
                return span.textContent == "Promoted";
            }).length != 0;
        }).length != 0;
    }).forEach(function(promotedTweet) {
        getParent(promotedTweet, 4).style.display = "none";
    });
}


//Adds a left border to the specified sidebar.
function addLeftSidebarBorder(context) {
    var colour;
    switch(document.body.style.backgroundColor) {
        //Dim
        case "rgb(21, 32, 43)":
            colour = "rgb(56, 68, 77)";
            break;
        //Lights out
        case "rgb(0, 0, 0)":
            colour = "rgb(47, 51, 54)";
            break;
        //Default
        default:
            colour = "rgb(230, 236, 240)";
            break;
    }

    var outerLeftSidebar = getParent(context, 1);
    outerLeftSidebar.style.borderColor = colour;
    outerLeftSidebar.style.borderStyle = "solid";
    outerLeftSidebar.style.borderLeftWidth = "1px";
}


function reduceSidebarTextSize(context) {
    [...context.getElementsByTagName("span")].filter(function(element) {
        return element.textContent != "Tweet";
    }).forEach(function(element) {
        element.style.fontWeight = "lighter";
    });
}


//Adds the custom CSS to the page's head in a new <style> tag.
function addCustomCSS() {
    var style = document.createElement("style");
    document.head.appendChild(style);
    style.type = "text/css";
    style.appendChild(document.createTextNode(customCSS));
}


function handlePage(mainContainer, location) {
    switch(location) {
        case "home":
            handleMainPage(mainContainer);
            break;
        case "status":
            handleConversationPage(mainContainer);
            break;
        case "explore":
            handleExplorePage(mainContainer);
            break;
        default:
            break;
    }
}


function handleMainPage(context) {
    waitForElement(context, true, findTweetsSection, function(tweetsSection) {
        replaceLinks(tweetsSection);
        removePromotedTweets(tweetsSection);

        var tweetObserver = new MutationObserver(function(mutationsList, observer) {
            removePromotedTweets(tweetsSection);
            replaceLinks(tweetsSection);
        });
    
        tweetObserver.observe(tweetsSection, { attributes: false, childList: true, subtree: true });
        pushMutationObserver(tweetObserver);
    });

    waitForElement(context, true, findComposeBox, function(composeBox) {
        composeBox.style.width = "100%";
        composeBox.style.marginLeft = "auto";
        composeBox.style.marginRight = "auto";
    });
}


function handleConversationPage(context) {
    //Squash conversation box
    waitForElement(context, true,
        function(context) {
            return firstOf([...context.getElementsByTagName("div")].filter(function(article) {
                return article.getAttribute("aria-label") == "Timeline: Conversation";
            }));
        },

        function(conversation) {
            conversation.style.marginLeft = "auto";
            conversation.style.marginRight = "auto";
            conversation.style.width = "60%";

            replaceLinks(conversation);

            var mutationObserver = new MutationObserver(function(mutationsList, observer) {
                replaceLinks(conversation);
            });
        
            mutationObserver.observe(conversation, { attributes: false, childList: true, subtree: true });
            pushMutationObserver(mutationObserver);
        }
    );
}


function handleExplorePage(context) {
    waitForElement(context, true,
        function(context) {
            return getParent(firstOf([...context.getElementsByTagName("form")].filter(function(form) {
                return form.getAttribute("role") == "search";
            })), 1);
        },

        function(searchBarContainer) {
            searchBarContainer.style.width = "80%";
            searchBarContainer.style.marginLeft = "auto";
            searchBarContainer.style.marginRight = "auto";
        }
    );
}


addCustomCSS();


waitForElement(document, false, findMainStaticContainer, function(mainContainer) {
    currentLocation = getLocation();
    handlePage(mainContainer, currentLocation);

    var mainMutationObserver = new MutationObserver(function(mutationsList, observer) {
        var newLocation = getLocation();

        if(newLocation != currentLocation) {
            currentLocation = newLocation;
            clearMutationObservers();
            handlePage(mainContainer, newLocation);
        }
    });

    mainMutationObserver.observe(mainContainer, { attributes: false, childList: true, subtree: true });
});


waitForElements(document, false, [findLeftSidebar, findRightSidebar], function(elements) {
    var leftSidebar = elements[0];
    var rightSidebar = elements[1];

    waitForElement(leftSidebar, true,
        function(context) {
            return getParent(firstOf([...context.getElementsByTagName("nav")].filter(function(element) {
                return element.getAttribute("role") == "navigation";
            })), 2);
        },

        function(leftSidebarContentContainer) {
            //Move footer from right sidebar to left sidebar
            waitForElement(rightSidebar, true,
                function(context) {
                    return getParent(firstOf([...context.getElementsByTagName("nav")].filter(function(nav) {
                        return nav.getAttribute("aria-label") == "Footer";
                    })), 1);
                },
            
                function(footer) {
                    leftSidebarContentContainer.appendChild(footer);
                }
            );
        }
    );

    addLeftSidebarBorder(leftSidebar);
    reduceSidebarTextSize(leftSidebar);
});
