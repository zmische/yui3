/*
 * DOM event listener abstraction layer
 * @module event
 * @submodule event-base
 */

(function() {

// Unlike most of the library, this code has to be executed as soon as it is
// introduced into the page -- and it should only be executed one time
// regardless of the number of instances that use it.

var stateChangeListener,
    GLOBAL_ENV   = YUI.Env, 
    config       = YUI.config, 
    doc          = config.doc, 
    docElement   = doc && doc.documentElement, 
    doScrollCap  = docElement && docElement.doScroll,
    add          = YUI.Env.add,
    remove       = YUI.Env.remove,
    targetEvent  = (doScrollCap) ? 'onreadystatechange' : 'DOMContentLoaded',
    pollInterval = config.pollInterval || 40,
    _ready       = function(e) {
                     GLOBAL_ENV._ready();
                 };

if (!GLOBAL_ENV._ready) {
    GLOBAL_ENV._ready = function() {
        if (!GLOBAL_ENV.DOMReady) {
            GLOBAL_ENV.DOMReady = true;
            remove(doc, targetEvent, _ready); // remove DOMContentLoaded listener
        }
    };

/*! DOMReady: based on work by: Dean Edwards/John Resig/Matthias Miller/Diego Perini */
// Internet Explorer: use the doScroll() method on the root element.  This isolates what 
// appears to be a safe moment to manipulate the DOM prior to when the document's readyState 
// suggests it is safe to do so.
    if (doScrollCap) {
        if (self !== self.top) {
            stateChangeListener = function() {
                if (doc.readyState == 'complete') {
                    remove(doc, targetEvent, stateChangeListener); // remove onreadystatechange listener
                    _ready();
                }
            };
            add(doc, targetEvent, stateChangeListener); // add onreadystatechange listener
        } else {
            GLOBAL_ENV._dri = setInterval(function() {
                try {
                    docElement.doScroll('left');
                    clearInterval(GLOBAL_ENV._dri);
                    GLOBAL_ENV._dri = null;
                    _ready();
                } catch (domNotReady) { }
            }, pollInterval); 
        }
    } else { // FireFox, Opera, Safari 3+ provide an event for this moment.
        add(doc, targetEvent, _ready); // add DOMContentLoaded listener
    }
}

})();
YUI.add('event-base', function(Y) {

(function() {
/*
 * DOM event listener abstraction layer
 * @module event
 * @submodule event-base
 */

var GLOBAL_ENV = YUI.Env,
    
    yready = function() {
        Y.fire('domready');
    };

/**
 * The domready event fires at the moment the browser's DOM is
 * usable. In most cases, this is before images are fully
 * downloaded, allowing you to provide a more responsive user
 * interface.
 *
 * In YUI 3, domready subscribers will be notified immediately if
 * that moment has already passed when the subscription is created.
 *
 * One exception is if the yui.js file is dynamically injected into
 * the page.  If this is done, you must tell the YUI instance that
 * you did this in order for DOMReady (and window load events) to
 * fire normally.  That configuration option is 'injected' -- set
 * it to true if the yui.js script is not included inline.
 *
 * This method is part of the 'event-ready' module, which is a
 * submodule of 'event'.  
 *
 * @event domready
 * @for YUI
 */
Y.publish('domready', {
    fireOnce: true,
    async: true
});

if (GLOBAL_ENV.DOMReady) {
    // console.log('DOMReady already fired', 'info', 'event');
    yready();
} else {
    // console.log('setting up before listener', 'info', 'event');
    // console.log('env: ' + YUI.Env.windowLoaded, 'info', 'event');
    Y.before(yready, GLOBAL_ENV, "_ready");
}

})();
(function() {

/**
 * Custom event engine, DOM event listener abstraction layer, synthetic DOM 
 * events.
 * @module event
 * @submodule event-base
 */

/**
 * Wraps a DOM event, properties requiring browser abstraction are
 * fixed here.  Provids a security layer when required.
 * @class DOMEventFacade
 * @param ev {Event} the DOM event
 * @param currentTarget {HTMLElement} the element the listener was attached to
 * @param wrapper {Event.Custom} the custom event wrapper for this DOM event
 */

/*
 * @TODO constants? LEFTBUTTON, MIDDLEBUTTON, RIGHTBUTTON, keys
 */

/*

var whitelist = {
    altKey          : 1,
    // "button"          : 1, // we supply
    // "bubbles"         : 1, // needed?
    // "cancelable"      : 1, // needed? 
    // "charCode"        : 1, // we supply
    cancelBubble    : 1,
    // "currentTarget"   : 1, // we supply
    ctrlKey         : 1,
    clientX         : 1, // needed?
    clientY         : 1, // needed?
    detail          : 1, // not fully implemented
    // "fromElement"     : 1,
    keyCode         : 1,
    // "height"          : 1, // needed?
    // "initEvent"       : 1, // need the init events?
    // "initMouseEvent"  : 1,
    // "initUIEvent"     : 1,
    // "layerX"          : 1, // needed?
    // "layerY"          : 1, // needed?
    metaKey         : 1,
    // "modifiers"       : 1, // needed?
    // "offsetX"         : 1, // needed?
    // "offsetY"         : 1, // needed?
    // "preventDefault"  : 1, // we supply
    // "reason"          : 1, // IE proprietary
    // "relatedTarget"   : 1,
    // "returnValue"     : 1, // needed?
    shiftKey        : 1,
    // "srcUrn"          : 1, // IE proprietary
    // "srcElement"      : 1,
    // "srcFilter"       : 1, IE proprietary
    // "stopPropagation" : 1, // we supply
    // "target"          : 1,
    // "timeStamp"       : 1, // needed?
    // "toElement"       : 1,
    type            : 1,
    // "view"            : 1,
    // "which"           : 1, // we supply
    // "width"           : 1, // needed?
    x               : 1,
    y               : 1
},

*/

    var ua = Y.UA,

    /**
     * webkit key remapping required for Safari < 3.1
     * @property webkitKeymap
     * @private
     */
    webkitKeymap = {
        63232: 38, // up
        63233: 40, // down
        63234: 37, // left
        63235: 39, // right
        63276: 33, // page up
        63277: 34, // page down
        25:     9, // SHIFT-TAB (Safari provides a different key code in
                   // this case, even though the shiftKey modifier is set)
        63272: 46, // delete
        63273: 36, // home
        63275: 35  // end
    },

    /**
     * Returns a wrapped node.  Intended to be used on event targets,
     * so it will return the node's parent if the target is a text
     * node.
     *
     * If accessing a property of the node throws an error, this is
     * probably the anonymous div wrapper Gecko adds inside text
     * nodes.  This likely will only occur when attempting to access
     * the relatedTarget.  In this case, we now return null because
     * the anonymous div is completely useless and we do not know
     * what the related target was because we can't even get to
     * the element's parent node.
     *
     * @method resolve
     * @private
     */
    resolve = function(n) {
        try {
            if (n && 3 == n.nodeType) {
                n = n.parentNode;
            }
        } catch(e) { 
            return null;
        }

        return Y.one(n);
    };


// provide a single event with browser abstractions resolved
//
// include all properties for both browers?
// include only DOM2 spec properties?
// provide browser-specific facade?

Y.DOMEventFacade = function(ev, currentTarget, wrapper) {

    wrapper = wrapper || {};

    var e = ev, ot = currentTarget, d = Y.config.doc, b = d.body,
        x = e.pageX, y = e.pageY, c, t, 
        overrides = wrapper.overrides || {};

    this.altKey   = e.altKey;
    this.ctrlKey  = e.ctrlKey;
    this.metaKey  = e.metaKey;
    this.shiftKey = e.shiftKey;
    this.type     = overrides.type || e.type;
    this.clientX  = e.clientX;
    this.clientY  = e.clientY;

    //////////////////////////////////////////////////////

    if (!x && 0 !== x) {
        x = e.clientX || 0;
        y = e.clientY || 0;

        if (ua.ie) {
            x += Math.max(d.documentElement.scrollLeft, b.scrollLeft);
            y += Math.max(d.documentElement.scrollTop, b.scrollTop);
        }
    }

    this._yuifacade = true;

    /**
     * The native event
     * @property _event
     */
    this._event = e;

    /**
     * The X location of the event on the page (including scroll)
     * @property pageX
     * @type int
     */
    this.pageX = x;

    /**
     * The Y location of the event on the page (including scroll)
     * @property pageY
     * @type int
     */
    this.pageY = y;

    //////////////////////////////////////////////////////

    c = e.keyCode || e.charCode || 0;

    if (ua.webkit && (c in webkitKeymap)) {
        c = webkitKeymap[c];
    }

    /**
     * The keyCode for key events.  Uses charCode if keyCode is not available
     * @property keyCode
     * @type int
     */
    this.keyCode = c;

    /**
     * The charCode for key events.  Same as keyCode
     * @property charCode
     * @type int
     */
    this.charCode = c;

    //////////////////////////////////////////////////////

    /**
     * The button that was pushed.
     * @property button
     * @type int
     */
    this.button = e.which || e.button;

    /**
     * The button that was pushed.  Same as button.
     * @property which
     * @type int
     */
    this.which = this.button;

    //////////////////////////////////////////////////////

    /**
     * Node reference for the targeted element
     * @propery target
     * @type Node
     */
    this.target = resolve(e.target || e.srcElement);

    /**
     * Node reference for the element that the listener was attached to.
     * @propery currentTarget
     * @type Node
     */
    this.currentTarget = resolve(ot);

    t = e.relatedTarget;

    if (!t) {
        if (e.type == "mouseout") {
            t = e.toElement;
        } else if (e.type == "mouseover") {
            t = e.fromElement;
        }
    }

    /**
     * Node reference to the relatedTarget
     * @propery relatedTarget
     * @type Node
     */
    this.relatedTarget = resolve(t);

    /**
     * Number representing the direction and velocity of the movement of the mousewheel.
     * Negative is down, the higher the number, the faster.  Applies to the mousewheel event.
     * @property wheelDelta
     * @type int
     */
    if (e.type == "mousewheel" || e.type == "DOMMouseScroll") {
        this.wheelDelta = (e.detail) ? (e.detail * -1) : Math.round(e.wheelDelta / 80) || ((e.wheelDelta < 0) ? -1 : 1);
    }

    //////////////////////////////////////////////////////
    // methods

    /**
     * Stops the propagation to the next bubble target
     * @method stopPropagation
     */
    this.stopPropagation = function() {
        if (e.stopPropagation) {
            e.stopPropagation();
        } else {
            e.cancelBubble = true;
        }
        wrapper.stopped = 1;
        this.stopped = 1;
    };

    /**
     * Stops the propagation to the next bubble target and
     * prevents any additional listeners from being exectued
     * on the current target.
     * @method stopImmediatePropagation
     */
    this.stopImmediatePropagation = function() {
        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
        } else {
            this.stopPropagation();
        }
        wrapper.stopped = 2;
        this.stopped = 2;
    };

    /**
     * Prevents the event's default behavior
     * @method preventDefault
     * @param returnValue {string} sets the returnValue of the event to this value
     * (rather than the default false value).  This can be used to add a customized 
     * confirmation query to the beforeunload event).
     */
    this.preventDefault = function(returnValue) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.returnValue = returnValue || false;
        wrapper.prevented = 1;
        this.prevented = 1;
    };

    /**
     * Stops the event propagation and prevents the default
     * event behavior.
     * @method halt
     * @param immediate {boolean} if true additional listeners
     * on the current target will not be executed
     */
    this.halt = function(immediate) {
        if (immediate) {
            this.stopImmediatePropagation();
        } else {
            this.stopPropagation();
        }

        this.preventDefault();
    };

    if (this._touch) {
        this._touch(e, currentTarget, wrapper);
    }

};

})();
(function() {
/**
 * DOM event listener abstraction layer
 * @module event
 * @submodule event-base
 */

/**
 * The event utility provides functions to add and remove event listeners,
 * event cleansing.  It also tries to automatically remove listeners it
 * registers during the unload event.
 *
 * @class Event
 * @static
 */

Y.Env.evt.dom_wrappers = {};
Y.Env.evt.dom_map = {};

var _eventenv = Y.Env.evt,
config = Y.config,
win = config.win,
add = YUI.Env.add,
remove = YUI.Env.remove,

onLoad = function() {
    YUI.Env.windowLoaded = true;
    Y.Event._load();
    remove(win, "load", onLoad);
},

onUnload = function() {
    Y.Event._unload();
    remove(win, "unload", onUnload);
},

EVENT_READY = 'domready',

COMPAT_ARG = '~yui|2|compat~',

shouldIterate = function(o) {
    try {
        return (o && typeof o !== "string" && Y.Lang.isNumber(o.length) && !o.tagName && !o.alert);
    } catch(ex) {
        return false;
    }

},

Event = function() {

    /**
     * True after the onload event has fired
     * @property _loadComplete
     * @type boolean
     * @static
     * @private
     */
    var _loadComplete =  false,

    /**
     * The number of times to poll after window.onload.  This number is
     * increased if additional late-bound handlers are requested after
     * the page load.
     * @property _retryCount
     * @static
     * @private
     */
    _retryCount = 0,

    /**
     * onAvailable listeners
     * @property _avail
     * @static
     * @private
     */
    _avail = [],

    /**
     * Custom event wrappers for DOM events.  Key is 
     * 'event:' + Element uid stamp + event type
     * @property _wrappers
     * @type Y.Event.Custom
     * @static
     * @private
     */
    _wrappers = _eventenv.dom_wrappers,

    _windowLoadKey = null,

    /**
     * Custom event wrapper map DOM events.  Key is 
     * Element uid stamp.  Each item is a hash of custom event
     * wrappers as provided in the _wrappers collection.  This
     * provides the infrastructure for getListeners.
     * @property _el_events
     * @static
     * @private
     */
    _el_events = _eventenv.dom_map;

    return {

        /**
         * The number of times we should look for elements that are not
         * in the DOM at the time the event is requested after the document
         * has been loaded.  The default is 1000@amp;40 ms, so it will poll
         * for 40 seconds or until all outstanding handlers are bound
         * (whichever comes first).
         * @property POLL_RETRYS
         * @type int
         * @static
         * @final
         */
        POLL_RETRYS: 1000,

        /**
         * The poll interval in milliseconds
         * @property POLL_INTERVAL
         * @type int
         * @static
         * @final
         */
        POLL_INTERVAL: 40,

        /**
         * addListener/removeListener can throw errors in unexpected scenarios.
         * These errors are suppressed, the method returns false, and this property
         * is set
         * @property lastError
         * @static
         * @type Error
         */
        lastError: null,


        /**
         * poll handle
         * @property _interval
         * @static
         * @private
         */
        _interval: null,

        /**
         * document readystate poll handle
         * @property _dri
         * @static
         * @private
         */
         _dri: null,

        /**
         * True when the document is initially usable
         * @property DOMReady
         * @type boolean
         * @static
         */
        DOMReady: false,

        /**
         * @method startInterval
         * @static
         * @private
         */
        startInterval: function() {
            if (!Event._interval) {
Event._interval = setInterval(Y.bind(Event._poll, Event), Event.POLL_INTERVAL);
            }
        },

        /**
         * Executes the supplied callback when the item with the supplied
         * id is found.  This is meant to be used to execute behavior as
         * soon as possible as the page loads.  If you use this after the
         * initial page load it will poll for a fixed time for the element.
         * The number of times it will poll and the frequency are
         * configurable.  By default it will poll for 10 seconds.
         *
         * <p>The callback is executed with a single parameter:
         * the custom object parameter, if provided.</p>
         *
         * @method onAvailable
         *
         * @param {string||string[]}   id the id of the element, or an array
         * of ids to look for.
         * @param {function} fn what to execute when the element is found.
         * @param {object}   p_obj an optional object to be passed back as
         *                   a parameter to fn.
         * @param {boolean|object}  p_override If set to true, fn will execute
         *                   in the context of p_obj, if set to an object it
         *                   will execute in the context of that object
         * @param checkContent {boolean} check child node readiness (onContentReady)
         * @static
         * @deprecated Use Y.on("available")
         */
        // @TODO fix arguments
        onAvailable: function(id, fn, p_obj, p_override, checkContent, compat) {

            var a = Y.Array(id), i, availHandle;


            for (i=0; i<a.length; i=i+1) {
                _avail.push({ 
                    id:         a[i], 
                    fn:         fn, 
                    obj:        p_obj, 
                    override:   p_override, 
                    checkReady: checkContent,
                    compat:     compat 
                });
            }
            _retryCount = this.POLL_RETRYS;

            // We want the first test to be immediate, but async
            setTimeout(Y.bind(Event._poll, Event), 0);

            availHandle = new Y.EventHandle({

                _delete: function() {
                    // set by the event system for lazy DOM listeners
                    if (availHandle.handle) {
                        availHandle.handle.detach();
                        return;
                    }

                    var i, j;

                    // otherwise try to remove the onAvailable listener(s)
                    for (i = 0; i < a.length; i++) {
                        for (j = 0; j < _avail.length; j++) {
                            if (a[i] === _avail[j].id) {
                                _avail.splice(j, 1);
                            }
                        }
                    }
                }

            });

            return availHandle;
        },

        /**
         * Works the same way as onAvailable, but additionally checks the
         * state of sibling elements to determine if the content of the
         * available element is safe to modify.
         *
         * <p>The callback is executed with a single parameter:
         * the custom object parameter, if provided.</p>
         *
         * @method onContentReady
         *
         * @param {string}   id the id of the element to look for.
         * @param {function} fn what to execute when the element is ready.
         * @param {object}   p_obj an optional object to be passed back as
         *                   a parameter to fn.
         * @param {boolean|object}  p_override If set to true, fn will execute
         *                   in the context of p_obj.  If an object, fn will
         *                   exectute in the context of that object
         *
         * @static
         * @deprecated Use Y.on("contentready")
         */
        // @TODO fix arguments
        onContentReady: function(id, fn, p_obj, p_override, compat) {
            return this.onAvailable(id, fn, p_obj, p_override, true, compat);
        },

        /**
         * Adds an event listener
         *
         * @method attach
         *
         * @param {String}   type     The type of event to append
         * @param {Function} fn        The method the event invokes
         * @param {String|HTMLElement|Array|NodeList} el An id, an element 
         *  reference, or a collection of ids and/or elements to assign the 
         *  listener to.
         * @param {Object}   context optional context object
         * @param {Boolean|object}  args 0..n arguments to pass to the callback
         * @return {EventHandle} an object to that can be used to detach the listener
         *                     
         * @static
         */

        attach: function(type, fn, el, context) {
            return Event._attach(Y.Array(arguments, 0, true));
        },

        _createWrapper: function (el, type, capture, compat, facade) {

            var cewrapper,
                ek  = Y.stamp(el),
                key = 'event:' + ek + type;

            if (false === facade) {
                key += 'native';
            }
            if (capture) {
                key += 'capture';
            }


            cewrapper = _wrappers[key];
            

            if (!cewrapper) {
                // create CE wrapper
                cewrapper = Y.publish(key, {
                    silent: true,
                    bubbles: false,
                    contextFn: function() {
                        if (compat) {
                            return cewrapper.el;
                        } else {
                            cewrapper.nodeRef = cewrapper.nodeRef || Y.one(cewrapper.el);
                            return cewrapper.nodeRef;
                        }
                    }
                });

                cewrapper.overrides = {};
            
                // for later removeListener calls
                cewrapper.el = el;
                cewrapper.key = key;
                cewrapper.domkey = ek;
                cewrapper.type = type;
                cewrapper.fn = function(e) {
                    cewrapper.fire(Event.getEvent(e, el, (compat || (false === facade))));
                };
                cewrapper.capture = capture;
            
                if (el == win && type == "load") {
                    // window load happens once
                    cewrapper.fireOnce = true;
                    _windowLoadKey = key;
                }
            
                _wrappers[key] = cewrapper;
                _el_events[ek] = _el_events[ek] || {};
                _el_events[ek][key] = cewrapper;
            
                add(el, type, cewrapper.fn, capture);
            }

            return cewrapper;
            
        },

        _attach: function(args, conf) {

            var compat, 
                handles, oEl, cewrapper, context, 
                fireNow = false, ret,
                type = args[0],
                fn = args[1],
                el = args[2] || win,
                facade = conf && conf.facade,
                capture = conf && conf.capture,
                overrides = conf && conf.overrides; 

            if (args[args.length-1] === COMPAT_ARG) {
                compat = true;
                // trimmedArgs.pop();
            }

            if (!fn || !fn.call) {
// throw new TypeError(type + " attach call failed, callback undefined");
                return false;
            }

            // The el argument can be an array of elements or element ids.
            if (shouldIterate(el)) {

                handles=[];
                
                Y.each(el, function(v, k) {
                    args[2] = v;
                    handles.push(Event._attach(args, conf));
                });

                // return (handles.length === 1) ? handles[0] : handles;
                return new Y.EventHandle(handles);

            // If the el argument is a string, we assume it is 
            // actually the id of the element.  If the page is loaded
            // we convert el to the actual element, otherwise we 
            // defer attaching the event until the element is
            // ready
            } else if (Y.Lang.isString(el)) {

                // oEl = (compat) ? Y.DOM.byId(el) : Y.Selector.query(el);

                if (compat) {
                    oEl = Y.DOM.byId(el);
                } else {

                    oEl = Y.Selector.query(el);

                    switch (oEl.length) {
                        case 0:
                            oEl = null;
                            break;
                        case 1:
                            oEl = oEl[0];
                            break;
                        default:
                            args[2] = oEl;
                            return Event._attach(args, conf);
                    }
                }

                if (oEl) {

                    el = oEl;

                // Not found = defer adding the event until the element is available
                } else {

                    ret = this.onAvailable(el, function() {
                        
                        ret.handle = Event._attach(args, conf);

                    }, Event, true, false, compat);

                    return ret;

                }
            }

            // Element should be an html element or node
            if (!el) {
                return false;
            }

            if (Y.Node && el instanceof Y.Node) {
                el = Y.Node.getDOMNode(el);
            }

            cewrapper = this._createWrapper(el, type, capture, compat, facade);
            if (overrides) {
                Y.mix(cewrapper.overrides, overrides);
            }

            if (el == win && type == "load") {

                // if the load is complete, fire immediately.
                // all subscribers, including the current one
                // will be notified.
                if (YUI.Env.windowLoaded) {
                    fireNow = true;
                }
            }

            if (compat) {
                args.pop();
            }

            context = args[3];

            // set context to the Node if not specified
            // ret = cewrapper.on.apply(cewrapper, trimmedArgs);
            ret = cewrapper._on(fn, context, (args.length > 4) ? args.slice(4) : null);

            if (fireNow) {
                cewrapper.fire();
            }

            return ret;

        },

        /**
         * Removes an event listener.  Supports the signature the event was bound
         * with, but the preferred way to remove listeners is using the handle
         * that is returned when using Y.on
         *
         * @method detach
         *
         * @param {String} type the type of event to remove.
         * @param {Function} fn the method the event invokes.  If fn is
         * undefined, then all event handlers for the type of event are 
         * removed.
         * @param {String|HTMLElement|Array|NodeList|EventHandle} el An 
         * event handle, an id, an element reference, or a collection 
         * of ids and/or elements to remove the listener from.
         * @return {boolean} true if the unbind was successful, false otherwise.
         * @static
         */
        detach: function(type, fn, el, obj) {

            var args=Y.Array(arguments, 0, true), compat, l, ok, i,
                id, ce;

            if (args[args.length-1] === COMPAT_ARG) {
                compat = true;
                // args.pop();
            }

            if (type && type.detach) {
                return type.detach();
            }

            // The el argument can be a string
            if (typeof el == "string") {

                // el = (compat) ? Y.DOM.byId(el) : Y.all(el);
                if (compat) {
                    el = Y.DOM.byId(el);
                } else {
                    el = Y.Selector.query(el);
                    l = el.length;
                    if (l < 1) {
                        el = null;
                    } else if (l == 1) {
                        el = el[0];
                    }
                }
                // return Event.detach.apply(Event, args);
            } 
            
            if (!el) {
                return false;
            }

            if (el.detach) {
                args.splice(2, 1);
                return el.detach.apply(el, args);
            // The el argument can be an array of elements or element ids.
            } else if (shouldIterate(el)) {
                ok = true;
                for (i=0, l=el.length; i<l; ++i) {
                    args[2] = el[i];
                    ok = ( Y.Event.detach.apply(Y.Event, args) && ok );
                }

                return ok;
            }

            if (!type || !fn || !fn.call) {
                return this.purgeElement(el, false, type);
            }

            id = 'event:' + Y.stamp(el) + type;
            ce = _wrappers[id];

            if (ce) {
                return ce.detach(fn);
            } else {
                return false;
            }

        },

        /**
         * Finds the event in the window object, the caller's arguments, or
         * in the arguments of another method in the callstack.  This is
         * executed automatically for events registered through the event
         * manager, so the implementer should not normally need to execute
         * this function at all.
         * @method getEvent
         * @param {Event} e the event parameter from the handler
         * @param {HTMLElement} el the element the listener was attached to
         * @return {Event} the event 
         * @static
         */
        getEvent: function(e, el, noFacade) {
            var ev = e || win.event;

            return (noFacade) ? ev : 
                new Y.DOMEventFacade(ev, el, _wrappers['event:' + Y.stamp(el) + e.type]);
        },

        /**
         * Generates an unique ID for the element if it does not already 
         * have one.
         * @method generateId
         * @param el the element to create the id for
         * @return {string} the resulting id of the element
         * @static
         */
        generateId: function(el) {
            var id = el.id;

            if (!id) {
                id = Y.stamp(el);
                el.id = id;
            }

            return id;
        },

        /**
         * We want to be able to use getElementsByTagName as a collection
         * to attach a group of events to.  Unfortunately, different 
         * browsers return different types of collections.  This function
         * tests to determine if the object is array-like.  It will also 
         * fail if the object is an array, but is empty.
         * @method _isValidCollection
         * @param o the object to test
         * @return {boolean} true if the object is array-like and populated
         * @deprecated was not meant to be used directly
         * @static
         * @private
         */
        _isValidCollection: shouldIterate,

        /**
         * hook up any deferred listeners
         * @method _load
         * @static
         * @private
         */
        _load: function(e) {
            if (!_loadComplete) {
                _loadComplete = true;

                // Just in case DOMReady did not go off for some reason
                // E._ready();
                if (Y.fire) {
                    Y.fire(EVENT_READY);
                }

                // Available elements may not have been detected before the
                // window load event fires. Try to find them now so that the
                // the user is more likely to get the onAvailable notifications
                // before the window load notification
                Event._poll();
            }
        },

        /**
         * Polling function that runs before the onload event fires, 
         * attempting to attach to DOM Nodes as soon as they are 
         * available
         * @method _poll
         * @static
         * @private
         */
        _poll: function() {
            if (this.locked) {
                return;
            }

            if (Y.UA.ie && !YUI.Env.DOMReady) {
                // Hold off if DOMReady has not fired and check current
                // readyState to protect against the IE operation aborted
                // issue.
                this.startInterval();
                return;
            }

            this.locked = true;

            // keep trying until after the page is loaded.  We need to 
            // check the page load state prior to trying to bind the 
            // elements so that we can be certain all elements have been 
            // tested appropriately
            var i, len, item, el, notAvail, executeItem,
                tryAgain = !_loadComplete;

            if (!tryAgain) {
                tryAgain = (_retryCount > 0);
            }

            // onAvailable
            notAvail = [];

            executeItem = function (el, item) {
                var context, ov = item.override;
                if (item.compat) {
                    if (item.override) {
                        if (ov === true) {
                            context = item.obj;
                        } else {
                            context = ov;
                        }
                    } else {
                        context = el;
                    }
                    item.fn.call(context, item.obj);
                } else {
                    context = item.obj || Y.one(el);
                    item.fn.apply(context, (Y.Lang.isArray(ov)) ? ov : []);
                }
            };

            // onAvailable
            for (i=0,len=_avail.length; i<len; ++i) {
                item = _avail[i];
                if (item && !item.checkReady) {

                    // el = (item.compat) ? Y.DOM.byId(item.id) : Y.one(item.id);
                    el = (item.compat) ? Y.DOM.byId(item.id) : Y.Selector.query(item.id, null, true);

                    if (el) {
                        executeItem(el, item);
                        _avail[i] = null;
                    } else {
                        notAvail.push(item);
                    }
                }
            }

            // onContentReady
            for (i=0,len=_avail.length; i<len; ++i) {
                item = _avail[i];
                if (item && item.checkReady) {

                    // el = (item.compat) ? Y.DOM.byId(item.id) : Y.one(item.id);
                    el = (item.compat) ? Y.DOM.byId(item.id) : Y.Selector.query(item.id, null, true);

                    if (el) {
                        // The element is available, but not necessarily ready
                        // @todo should we test parentNode.nextSibling?
                        if (_loadComplete || (el.get && el.get('nextSibling')) || el.nextSibling) {
                            executeItem(el, item);
                            _avail[i] = null;
                        }
                    } else {
                        notAvail.push(item);
                    }
                }
            }

            _retryCount = (notAvail.length === 0) ? 0 : _retryCount - 1;

            if (tryAgain) {
                // we may need to strip the nulled out items here
                this.startInterval();
            } else {
                clearInterval(this._interval);
                this._interval = null;
            }

            this.locked = false;

            return;

        },

        /**
         * Removes all listeners attached to the given element via addListener.
         * Optionally, the node's children can also be purged.
         * Optionally, you can specify a specific type of event to remove.
         * @method purgeElement
         * @param {HTMLElement} el the element to purge
         * @param {boolean} recurse recursively purge this element's children
         * as well.  Use with caution.
         * @param {string} type optional type of listener to purge. If
         * left out, all listeners will be removed
         * @static
         */
        purgeElement: function(el, recurse, type) {
            // var oEl = (Y.Lang.isString(el)) ? Y.one(el) : el,
            var oEl = (Y.Lang.isString(el)) ?  Y.Selector.query(el, null, true) : el,
                lis = this.getListeners(oEl, type), i, len, props, children, child;

            if (recurse && oEl) {
                lis = lis || [];
                children = Y.Selector.query('*', oEl);
                i = 0;
                len = children.length;
                for (; i < len; ++i) {
                    child = this.getListeners(children[i], type);
                    if (child) {
                        lis = lis.concat(child);
                    }
                }
            }

            if (lis) {
                i = 0;
                len = lis.length;
                for (; i < len; ++i) {
                    props = lis[i];
                    props.detachAll();
                    remove(props.el, props.type, props.fn, props.capture);
                    delete _wrappers[props.key];
                    delete _el_events[props.domkey][props.key];
                }
            }

        },


        /**
         * Returns all listeners attached to the given element via addListener.
         * Optionally, you can specify a specific type of event to return.
         * @method getListeners
         * @param el {HTMLElement|string} the element or element id to inspect 
         * @param type {string} optional type of listener to return. If
         * left out, all listeners will be returned
         * @return {Y.Custom.Event} the custom event wrapper for the DOM event(s)
         * @static
         */           
        getListeners: function(el, type) {
            var ek = Y.stamp(el, true), evts = _el_events[ek],
                results=[] , key = (type) ? 'event:' + ek + type : null;

            if (!evts) {
                return null;
            }

            if (key) {
                if (evts[key]) {
                    results.push(evts[key]);
                }

                // get native events as well
                key += 'native';
                if (evts[key]) {
                    results.push(evts[key]);
                }

            } else {
                Y.each(evts, function(v, k) {
                    results.push(v);
                });
            }

            return (results.length) ? results : null;
        },

        /**
         * Removes all listeners registered by pe.event.  Called 
         * automatically during the unload event.
         * @method _unload
         * @static
         * @private
         */
        _unload: function(e) {
            Y.each(_wrappers, function(v, k) {
                v.detachAll();
                remove(v.el, v.type, v.fn, v.capture);
                delete _wrappers[k];
                delete _el_events[v.domkey][k];
            });
        },

        
        /**
         * Adds a DOM event directly without the caching, cleanup, context adj, etc
         *
         * @method nativeAdd
         * @param {HTMLElement} el      the element to bind the handler to
         * @param {string}      type   the type of event handler
         * @param {function}    fn      the callback to invoke
         * @param {boolen}      capture capture or bubble phase
         * @static
         * @private
         */
        nativeAdd: add,

        /**
         * Basic remove listener
         *
         * @method nativeRemove
         * @param {HTMLElement} el      the element to bind the handler to
         * @param {string}      type   the type of event handler
         * @param {function}    fn      the callback to invoke
         * @param {boolen}      capture capture or bubble phase
         * @static
         * @private
         */
        nativeRemove: remove
    };

}();

Y.Event = Event;

if (config.injected || YUI.Env.windowLoaded) {
    onLoad();
} else {
    add(win, "load", onLoad);
}

// Process onAvailable/onContentReady items when when the DOM is ready in IE
if (Y.UA.ie) {
    Y.on(EVENT_READY, Event._poll, Event, true);
}

Y.on("unload", onUnload);

Event.Custom = Y.CustomEvent;
Event.Subscriber = Y.Subscriber;
Event.Target = Y.EventTarget;
Event.Handle = Y.EventHandle;
Event.Facade = Y.EventFacade;

Event._poll();

})();

/**
 * DOM event listener abstraction layer
 * @module event
 * @submodule event-base
 */

/**
 * Executes the callback as soon as the specified element 
 * is detected in the DOM.
 * @event available
 * @param type {string} 'available'
 * @param fn {function} the callback function to execute.
 * @param el {string|HTMLElement|collection} the element(s) to attach
 * @param context optional argument that specifies what 'this' refers to.
 * @param args* 0..n additional arguments to pass on to the callback function.
 * These arguments will be added after the event object.
 * @return {EventHandle} the detach handle
 * @for YUI
 */
Y.Env.evt.plugins.available = {
    on: function(type, fn, id, o) {
        var a = arguments.length > 4 ?  Y.Array(arguments, 4, true) : [];
        return Y.Event.onAvailable.call(Y.Event, id, fn, o, a);
    }
};

/**
 * Executes the callback as soon as the specified element 
 * is detected in the DOM with a nextSibling property
 * (indicating that the element's children are available)
 * @event contentready
 * @param type {string} 'contentready'
 * @param fn {function} the callback function to execute.
 * @param el {string|HTMLElement|collection} the element(s) to attach
 * @param context optional argument that specifies what 'this' refers to.
 * @param args* 0..n additional arguments to pass on to the callback function.
 * These arguments will be added after the event object.
 * @return {EventHandle} the detach handle
 * @for YUI
 */
Y.Env.evt.plugins.contentready = {
    on: function(type, fn, id, o) {
        var a = arguments.length > 4 ?  Y.Array(arguments, 4, true) : [];
        return Y.Event.onContentReady.call(Y.Event, id, fn, o, a);
    }
};


}, '@VERSION@' ,{requires:['event-custom-base']});
YUI.add('event-delegate', function(Y) {

/**
 * Adds event delegation support to the library.
 * 
 * @module event
 * @submodule event-delegate
 */

var toArray          = Y.Array,
    YLang            = Y.Lang,
    isString         = YLang.isString,
    selectorTest     = Y.Selector.test,
    detachCategories = Y.Env.evt.handles;

function delegate(type, fn, el, filter) {
    var args     = toArray(arguments, 0, true),
        query    = isString(el) ? el : null,
        typeBits = type.split(/\|/),
        synth, container, categories, cat, handle;

    if (typeBits.length > 1) {
        cat  = typeBits.shift();
        type = typeBits.shift();
    }

    synth = Y.Node.DOM_EVENTS[type];

    if (YLang.isObject(synth) && synth.delegate) {
        handle = synth.delegate.apply(synth, arguments);
    }

    if (!handle) {
        if (!type || !fn || !el || !filter) {
            return;
        }

        container = (query) ? Y.Selector.query(query, null, true) : el;

        if (!container && isString(el)) {
            handle = Y.on('available', function () {
                Y.mix(handle, Y.delegate.apply(Y, args), true);
            }, el);
        }

        if (!handle && container) {
            args.splice(2, 2, container); // remove the filter

            if (isString(filter)) {
                filter = Y.delegate.compileFilter(filter);
            }

            handle = Y.on.apply(Y, args);
            handle.sub.getCurrentTarget = filter;
            handle.sub._notify = Y.delegate.notifySub;
        }
    }

    if (handle && cat) {
        categories = detachCategories[cat]  || (detachCategories[cat] = {});
        categories = categories[type] || (categories[type] = []);
        categories.push(handle);
    }

    return handle;
}

delegate.notifySub = function (thisObj, args, ce) {
    // Preserve args for other subscribers
    args = args.slice();
    if (this.args) {
        args.push.apply(args, this.args);
    }

    // Only notify subs if the event occurred on a targeted element
    var currentTarget = this.getCurrentTarget.apply(this, args),
        originalEvent = args[0],
        container     = originalEvent.currentTarget,
        i, ret, target;

    if (currentTarget) {
        // Support multiple matches up the the container subtree
        currentTarget = toArray(currentTarget);

        for (i = currentTarget.length - 1; i >= 0; --i) {
            target = currentTarget[i];

            // New facade to avoid corrupting facade sent to direct subs
            args[0] = new Y.DOMEventFacade(originalEvent, target, ce);

            args[0].container = container;
        
            thisObj = this.context || target;

            ret = this.fn.apply(thisObj, args);

            if (ret === false) { // stop further notifications
                break;
            }
        }

        return ret;
    }
};

delegate.compileFilter = Y.cached(function (selector) {
    return function (e) {
        var container = e.currentTarget._node,
            target    = e.target._node,
            match     = [];

        while (target !== container) {
            if (selectorTest(target, selector, container)) {
                match.push(Y.one(target));
            }
            target = target.parentNode;
        }

        if (match.length <= 1) {
            match = match[0]; // single match or undefined
        }

        return match;
    };
});

/**
 * Sets up event delegation on a container element.  The delegated event
 * will use a supplied filter to test if the callback should be executed.
 * This filter can be either a selector string or a function that returns
 * a Node to use as the currentTarget for the event.
 *
 * The event object for the delegated event is supplied to the callback
 * function.  It is modified slightly in order to support all properties
 * that may be needed for event delegation.  'currentTarget' is set to
 * the element that matched the selector string filter or the Node returned
 * from the filter function.  'container' is set to the element that the
 * listener is delegated from (this normally would be the 'currentTarget').
 *
 * Filter functions will be called with the arguments that would be passed to
 * the callback function, including the event object as the first parameter.
 * The function should return false (or a falsey value) if the success criteria
 * aren't met, and the Node to use as the event's currentTarget and 'this'
 * object if they are.
 *
 * @method delegate
 * @param type {string} the event type to delegate
 * @param fn {function} the callback function to execute.  This function
 * will be provided the event object for the delegated event.
 * @param el {string|node} the element that is the delegation container
 * @param filter {string|function} a selector that must match the target of the
 * event or a function that returns a Node or false.
 * @param context optional argument that specifies what 'this' refers to.
 * @param args* 0..n additional arguments to pass on to the callback function.
 * These arguments will be added after the event object.
 * @return {EventHandle} the detach handle
 * @for YUI
 */
Y.delegate = Y.Event.delegate = delegate;


}, '@VERSION@' ,{requires:['node-base']});
YUI.add('event-synthetic', function(Y) {

var DOMMap   = Y.Env.evt.dom_map,
    toArray  = Y.Array,
    YLang    = Y.Lang,
    isObject = YLang.isObject,
    isString = YLang.isString,
    query    = Y.Selector.query,
    noop     = function () {};

function Notifier(handle, emitFacade, delegate) {
    this.handle     = handle;
    this.emitFacade = emitFacade;
    this.delegate   = delegate;
}

Notifier.prototype.fire = function (e) {
    // first arg to delegate notifier should be an object with currentTarget
    var args    = toArray(arguments, 0, true),
        handle  = this.handle,
        ce      = handle.evt,
        sub     = handle.sub,
        thisObj = sub.context,
        event   = e || {};

    if (this.emitFacade) {
        if (!e || !e.preventDefault) {
            event = ce._getFacade();

            if (isObject(e) && !e.preventDefault) {
                Y.mix(event, e, true);
                args[0] = event;
            } else {
                args.unshift(event);
            }
        }

        event.type    = ce.type;
        event.details = args.slice();

        if (this.delegate) {
            event.container = ce.host;
        }
    } else if (this.delegate && isObject(e) && e.currentTarget) {
        args.shift();
    }

    sub.context = thisObj || event.currentTarget || ce.host;
    ce.fire.apply(ce, args);
    sub.context = thisObj; // reset for future firing
};

function SyntheticEvent() {
    this._init.apply(this, arguments);
}

Y.mix(SyntheticEvent, {
    Notifier: Notifier,

    getRegistry: function (node, type, create) {
        var el     = node._node,
            yuid   = Y.stamp(el),
            key    = 'event:' + yuid + type + '_synth_',
            events = DOMMap[yuid] || (DOMMap[yuid] = {});

        if (!events[key] && create) {
            events[key] = {
                type      : '_synth_',
                fn        : noop,
                capture   : false,
                el        : el,
                key       : key,
                domkey    : yuid,
                notifiers : [],

                detachAll : function () {
                    var notifiers = this.notifiers,
                        i = notifiers.length;

                    while (--i >= 0) {
                        notifiers[i].detach();
                    }
                }
            };
        }

        return (events[key]) ? events[key].notifiers : null;
    },

    _deleteSub: function (sub) {
        if (sub && sub.fn) {
            var synth = this.eventDef,
                method = (sub.filter) ? 'detachDelegate' : 'detach';

            this.subscribers = {};
            this.subCount = 0;

            synth[method](sub.node, sub, this.notifier, sub.filter);
            synth._unregisterSub(sub);

            delete sub.fn;
            delete sub.node;
            delete sub.context;
        }
    },

    prototype: {
        constructor: SyntheticEvent,

        _init: function () {
            var config = this.publishConfig || (this.publishConfig = {});

            // The notification mechanism handles facade creation
            this.emitFacade = ('emitFacade' in config) ?
                                config.emitFacade :
                                true;
            config.emitFacade  = false;
        },

        /**
         * <p>Implement this function if the event supports a different
         * subscription signature.  This function is used by both on() and
         * delegate().  The second parameter indicates that the event is being
         * subscribed via delegate().</p>
         *
         * <p>Implementations must remove extra arguments from the args list
         * before returning.  The required args list order for on()
         * subscriptions is</p> <pre><code>(type, callback, target, thisObj,
         * argN...)</code></pre>
         *
         * <p>The required args list order for delegate() subscriptions is</p>
         *
         * <pre><code>(type, callback, target, filter, thisObj,
         * argN...)</code></pre>
         *
         * <p>The return value from this function will be stored on the
         * subscription in the '_extra' property for reference elsewhere.</p>
         *
         * @method processArgs
         * @param args {Array} parmeters passed to Y.on(..) or Y.delegate(..)
         * @param delegate {Boolean} true if the subscription is from Y.delegate
         * @return {any}
         */
        processArgs: noop,
        //allowDups  : false,

        on         : noop,
        detach     : noop,

        delegate       : noop,
        detachDelegate : noop,

        _on: function (args, delegate) {
            var handles  = [],
                selector = args[2],
                method   = delegate ? 'delegate' : 'on',
                nodes, handle;

            // Can't just use Y.all because it doesn't support window (yet?)
            nodes = (isString(selector)) ? query(selector) : toArray(selector);

            if (!nodes.length && isString(selector)) {
                handle = Y.on('available', function () {
                    Y.mix(handle, Y[method].apply(Y, args), true);
                }, selector);

                return handle;
            }

            Y.each(nodes, function (node) {
                var subArgs = args.slice(),
                    extra, filter;

                node = Y.one(node);

                if (node) {
                    extra = this.processArgs(subArgs, delegate);

                    if (delegate) {
                        filter = subArgs.splice(3, 1)[0];
                    }

                    // (type, fn, el, thisObj, ...) => (fn, thisObj, ...)
                    subArgs.splice(0, 4, subArgs[1], subArgs[3]);

                    if (this.allowDups || !this.getSubs(node, args,null,true)) {
                        handle = this._getNotifier(node, subArgs, extra,filter);

                        this[method](node, handle.sub, handle.notifier, filter);

                        handles.push(handle);
                    }
                }
            }, this);

            return (handles.length === 1) ?
                handles[0] :
                new Y.EventHandle(handles);
        },

        _getNotifier: function (node, args, extra, filter) {
            var dispatcher = new Y.CustomEvent(this.type, this.publishConfig),
                handle     = dispatcher.on.apply(dispatcher, args),
                notifier   = new Notifier(handle, this.emitFacade, filter),
                registry   = SyntheticEvent.getRegistry(node, this.type, true),
                sub        = handle.sub;

            handle.notifier   = notifier;

            sub.node   = node;
            sub.filter = filter;
            sub._extra = extra;

            Y.mix(dispatcher, {
                eventDef     : this,
                notifier     : notifier,
                host         : node,       // I forget what this is for
                currentTarget: node,       // for generating facades
                target       : node,       // for generating facades
                el           : node._node, // For category detach

                _delete      : SyntheticEvent._deleteSub
            }, true);

            registry.push(handle);

            return handle;
        },

        _unregisterSub: function (sub) {
            var notifiers = SyntheticEvent.getRegistry(sub.node, this.type),
                i;
                
            if (notifiers) {
                for (i = notifiers.length - 1; i >= 0; --i) {
                    if (notifiers[i].sub === sub) {
                        notifiers.splice(i, 1);
                        break;
                    }
                }
            }
        },

        _detach: function (args) {
            // Can't use Y.all because it doesn't support window (yet?)
            var target = args[2],
                els    = (isString(target)) ?
                            query(target) : toArray(target),
                node, i, len, handles, j;
            
            // (type, fn, el, context, filter?) => (type, fn, context, filter?)
            args.splice(2, 1);

            for (i = 0, len = els.length; i < len; ++i) {
                node = Y.one(els[i]);

                if (node) {
                    handles = this.getSubs(node, args);

                    if (handles) {
                        for (j = handles.length - 1; j >= 0; --j) {
                            handles[j].detach();
                        }
                    }
                }
            }
        },

        getSubs: function (node, args, filter, first) {
            var notifiers = SyntheticEvent.getRegistry(node, this.type),
                handles = [],
                i, len, handle;

            if (notifiers) {
                if (!filter) {
                    filter = this.subMatch;
                }

                for (i = 0, len = notifiers.length; i < len; ++i) {
                    handle = notifiers[i];
                    if (filter.call(this, handle.sub, args)) {
                        if (first) {
                            return handle;
                        } else {
                            handles.push(notifiers[i]);
                        }
                    }
                }
            }

            return handles.length && handles;
        },

        subMatch: function (sub, args) {
            // Default detach cares only about the callback matching
            return !args[1] || sub.fn === args[1];
        }
    }
}, true);

Y.SyntheticEvent = SyntheticEvent;

Y.Node.publish = Y.Event.define = function (type, config, force) {
    if (!config) {
        config = {};
    }

    var eventDef = (isObject(type)) ? type : Y.merge({ type: type }, config),
        Impl, synth;

    if (force || !Y.Node.DOM_EVENTS[eventDef.type]) {
        Impl = function () {
            SyntheticEvent.apply(this, arguments);
        };
        Y.extend(Impl, SyntheticEvent, eventDef);
        synth = new Impl();

        type = synth.type;

        Y.Node.DOM_EVENTS[type] = Y.Env.evt.plugins[type] = {
            eventDef: synth,

            on: function () {
                return synth._on(toArray(arguments));
            },

            delegate: function () {
                return synth._on(toArray(arguments), true);
            },

            detach: function () {
                return synth._detach(toArray(arguments));
            }
        };

    }
};


}, '@VERSION@' ,{requires:['node-base', 'event-custom']});
YUI.add('event-mousewheel', function(Y) {

/**
 * Adds mousewheel event support
 * @module event
 * @submodule event-mousewheel
 */
var DOM_MOUSE_SCROLL = 'DOMMouseScroll',
    fixArgs = function(args) {
        var a = Y.Array(args, 0, true), target;
        if (Y.UA.gecko) {
            a[0] = DOM_MOUSE_SCROLL;
            target = Y.config.win;
        } else {
            target = Y.config.doc;
        }

        if (a.length < 3) {
            a[2] = target;
        } else {
            a.splice(2, 0, target);
        }

        return a;
    };

/**
 * Mousewheel event.  This listener is automatically attached to the
 * correct target, so one should not be supplied.  Mouse wheel 
 * direction and velocity is stored in the 'mouseDelta' field.
 * @event mousewheel
 * @param type {string} 'mousewheel'
 * @param fn {function} the callback to execute
 * @param context optional context object
 * @param args 0..n additional arguments to provide to the listener.
 * @return {EventHandle} the detach handle
 * @for YUI
 */
Y.Env.evt.plugins.mousewheel = {
    on: function() {
        return Y.Event._attach(fixArgs(arguments));
    },

    detach: function() {
        return Y.Event.detach.apply(Y.Event, fixArgs(arguments));
    }
};


}, '@VERSION@' ,{requires:['node-base']});
YUI.add('event-mouseenter', function(Y) {

function notify(e, notifier) {
    var current = e.currentTarget,
        related = e.relatedTarget;

    if (current !== related && !current.contains(related)) {
        notifier.fire(e);
    }
}

var config = {
    proxyType: "mouseover",

    on: function (node, sub, notifier) {
        sub.onHandle = node.on(this.proxyType, notify, null, notifier);
    },

    detach: function (node, sub) {
        sub.onHandle.detach();
    },

    delegate: function (node, sub, notifier, filter) {
        sub.delegateHandle =
            Y.delegate(this.proxyType, notify, node, filter, null, notifier);
    },

    detachDelegate: function (node, sub) {
        sub.delegateHandle.detach();
    }
};

Y.Event.define("mouseenter", config, true);
Y.Event.define("mouseleave", Y.merge(config, { proxyType: "mouseout" }), true);


}, '@VERSION@' ,{requires:['event-synthetic']});
YUI.add('event-key', function(Y) {

/**
 * Functionality to listen for one or more specific key combinations.
 * @module event
 * @submodule event-key
 */

/**
 * Add a key listener.  The listener will only be notified if the
 * keystroke detected meets the supplied specification.  The
 * spec consists of the key event type, followed by a colon,
 * followed by zero or more comma separated key codes, followed
 * by zero or more modifiers delimited by a plus sign.  Ex:
 * press:12,65+shift+ctrl
 * @event key
 * @for YUI
 * @param type {string} 'key'
 * @param fn {function} the function to execute
 * @param id {string|HTMLElement|collection} the element(s) to bind
 * @param spec {string} the keyCode and modifier specification
 * @param o optional context object
 * @param args 0..n additional arguments to provide to the listener.
 * @return {Event.Handle} the detach handle
 */
Y.Env.evt.plugins.key = {

    on: function(type, fn, id, spec, o) {
        var a = Y.Array(arguments, 0, true), parsed, etype, criteria, ename;

        parsed = spec && spec.split(':');

        if (!spec || spec.indexOf(':') == -1 || !parsed[1]) {
            a[0] = 'key' + ((parsed && parsed[0]) || 'press');
            return Y.on.apply(Y, a);
        }

        // key event type: 'down', 'up', or 'press'
        etype = parsed[0];

        // list of key codes optionally followed by modifiers
        criteria = (parsed[1]) ? parsed[1].split(/,|\+/) : null;

        // the name of the custom event that will be created for the spec
        ename = (Y.Lang.isString(id) ? id : Y.stamp(id)) + spec;

        ename = ename.replace(/,/g, '_');

        if (!Y.getEvent(ename)) {

            // subscribe spec validator to the DOM event
            Y.on(type + etype, function(e) {

                
                var passed = false, failed = false, i, crit, critInt;

                for (i=0; i<criteria.length; i=i+1) {
                    crit = criteria[i]; 
                    critInt = parseInt(crit, 10);

                    // pass this section if any supplied keyCode 
                    // is found
                    if (Y.Lang.isNumber(critInt)) {

                        if (e.charCode === critInt) {
                            passed = true;
                        } else {
                            failed = true;
                        }

                    // only check modifier if no keyCode was specified
                    // or the keyCode check was successful.  pass only 
                    // if every modifier passes
                    } else if (passed || !failed) {
                        passed = (e[crit + 'Key']);
                        failed = !passed;
                    }                    
                }

                // fire spec custom event if spec if met
                if (passed) {
                    Y.fire(ename, e);
                }

            }, id);

        }

        // subscribe supplied listener to custom event for spec validator
        // remove element and spec.
        a.splice(2, 2);
        a[0] = ename;

        return Y.on.apply(Y, a);
    }
};


}, '@VERSION@' ,{requires:['node-base']});
YUI.add('event-focus', function(Y) {

var Event    = Y.Event,
    isString = Y.Lang.isString;

function define(type, proxy) {
    var nodeDataKey = '_' + type + 'Notifiers';

    Y.Event.define(type, {
        _attach: function (el, notifier, delegate) {
            return Event._attach(
                [this._proxyEvent, this._proxy, el, this, notifier, delegate],
                { capture: true });
        },

        _proxyEvent: proxy,

        _proxy: function (e, notifier, delegate) {
            var node      = e.target,
                el        = node._node,
                notifiers = node.getData(nodeDataKey),
                yuid      = Y.stamp(e.currentTarget),
                handle;

            notifier.currentTarget = (delegate) ? node : e.currentTarget;

            // Maintain a list to handle subscriptions from nested containers
            // div#a>div#b>input #a.on(focus..) #b.on(focus..), use one focus
            // or blur subscription that fires notifiers from #b then #a to
            // emulate bubble sequence.
            if (!notifiers) {
                notifiers = {};
                node.setData(nodeDataKey, notifiers);

                handle = Event._attach([type, this._notify, el]);
                // remove element level subscription after execution
                handle.sub.once = true;
            }

            if (!notifiers[yuid]) {
                notifiers[yuid] = [];
            }
            notifiers[yuid].push(notifier);
        },

        _notify: function (e) {
            var node      = e.currentTarget,
                notifiers = node.getData(nodeDataKey),
                            // document.get('ownerDocument') returns null
                doc       = node.get('ownerDocument') || node,
                target    = node,
                nots      = [],
                i, len;

            // Walk up the parent axis until the origin node, 
            while (target && target !== doc) {
                nots.push.apply(nots, notifiers[Y.stamp(target)] || []);
                target = target.get('parentNode');
            }
            nots.push.apply(nots, notifiers[Y.stamp(doc)] || []);

            for (i = 0, len = nots.length; i < len; ++i) {
                e.currentTarget = nots[i].currentTarget;

                nots[i].fire(e);
            }

            // leaving the element pristine, as if nothing ever happened...
            node.clearData(nodeDataKey);
        },

        on: function (node, sub, notifier) {
            sub.onHandle = this._attach(node._node, notifier);
        },

        detach: function (node, sub) {
            sub.onHandle.detach();
        },

        delegate: function (node, sub, notifier, filter) {
            if (isString(filter)) {
                filter = Y.delegate.compileFilter(filter);
            }

            var handle = this._attach(node._node, notifier, true);
            handle.sub.getCurrentTarget = filter;
            handle.sub._notify = Y.delegate.notifySub;

            sub.delegateHandle = handle;
        },

        detachDelegate: function (node, sub) {
            sub.delegateHandle.detach();
        }
    }, true);
}

define('focus', ('onfocusin'  in Y.config.doc) ? "beforeactivate"   : "focus");
define('blur',  ('onfocusout' in Y.config.doc) ? "beforedeactivate" : "blur");


}, '@VERSION@' ,{requires:['event-synthetic']});
YUI.add('event-resize', function(Y) {

/**
 * Adds a window resize event that has its behavior normalized to fire at the
 * end of the resize rather than constantly during the resize.
 * @module event
 * @submodule event-resize
 */
(function() {

var detachHandle,

    timerHandle,

    CE_NAME = 'window:resize',

    handler = function(e) {

        if (Y.UA.gecko) {

            Y.fire(CE_NAME, e);

        } else {

            if (timerHandle) {
                timerHandle.cancel();
            }

            timerHandle = Y.later(Y.config.windowResizeDelay || 40, Y, function() {
                Y.fire(CE_NAME, e);
            });
        }
        
    };


/**
 * Firefox fires the window resize event once when the resize action
 * finishes, other browsers fire the event periodically during the
 * resize.  This code uses timeout logic to simulate the Firefox 
 * behavior in other browsers.
 * @event windowresize
 * @for YUI
 */
Y.Env.evt.plugins.windowresize = {

    on: function(type, fn) {

        // check for single window listener and add if needed
        if (!detachHandle) {
            detachHandle = Y.Event._attach(['resize', handler]);
        }

        var a = Y.Array(arguments, 0, true);
        a[0] = CE_NAME;

        return Y.on.apply(Y, a);
    }
};

})();


}, '@VERSION@' ,{requires:['node-base']});


YUI.add('event', function(Y){}, '@VERSION@' ,{use:['event-base', 'event-delegate', 'event-synthetic', 'event-mousewheel', 'event-mouseenter', 'event-key', 'event-focus', 'event-resize']});

