// ==========================================================================
// Project:   The M-Project - Mobile HTML5 Application Framework
// Copyright: (c) 2011 panacoda GmbH. All rights reserved.
// Creator:   dominik
// Date:      10.04.12
// License:   Dual licensed under the MIT or GPL Version 2 licenses.
//            http://github.com/mwaylabs/The-M-Project/blob/master/MIT-LICENSE
//            http://github.com/mwaylabs/The-M-Project/blob/master/GPL-LICENSE
// ==========================================================================

/**
 * A constant value for calculating the carousel's size based on its content.
 *
 * @type Number
 */
M.CAROUSEL_SIZE_CONTENT = 1;

/**
 * A constant value for calculating the carousel's size based on its surrounding element.
 *
 * @type Number
 */
M.CAROUSEL_SIZE_SURROUNDING_ELEMENT = 2;

/**
 * A constant value for not calculating the size at all.
 *
 * Note: you will have to take care of this instead!
 *
 * @type Number
 */
M.CAROUSEL_SIZE_NONE = 3;


/**
 * @class
 *
 * A carousel is a view that allows you to slide/scroll vertically or horizontally
 * through a set of items. If required, a paginator indicates the user which item
 * is currently visible and how many of them are there at all.
 *
 * @extends M.View
 */
M.CarouselView = M.View.extend(
/** @scope M.CarouselView.prototype */ {

    /**
     * The type of this object.
     *
     * @type String
     */
    type: 'M.CarouselView',

    /**
     * This property is used inernally to count the number of theme calls once the
     * carousel was added to dom.
     *
     * @private
     * @type Number
     */
    numOfThemeCalls: 0,

    /**
     * This property is used internally to store the reference width of the parent element
     * of the carousel which is needed for theming.
     *
     * @private
     * @type Number
     */
    lastWidth: 0,

    /**
     * This property specifies the recommended events for this type of view.
     *
     * @type Array
     */
    recommendedEvents: ['change'],

    /**
     * This property is used internally to store the iScroll object for this carousel.
     *
     * @private
     * @type Object
     */
    iScroll: null,

    /* This property contains the numerical index of the currently visible item of the
     * carousel.
     *
     * @private
     * @type Number
     */
    activeItem: 1,

    /* This property contains the number of items within the carousel.
     *
     * @private
     * @type Number
     */
    numItems: 0,

    /* This property contains a flag telling us whether the carousel was correctly
     * initialized or not. Whenever there is an orientation change event, this flag
     * needs to be reset.
     *
     * @private
     * @type Boolean
     */
    isInitialized: NO,

    /* TT
     *
     * @type Boolean
     */
    showPaginator: YES,

    /**
     * This property determines whether the carousel is vertically or horizontally
     * scrollable.
     *
     * Possible values are:
     * - M.HORIZONTAL: horizontal
     * - M.VERTICAL: vertical
     *
     * @type String
     */
    direction: M.HORIZONTAL,

    /* This property can be used to specify on what bases the size of the carousel
     * shall be calculated. By default the content of the items determine that size.
     * So the item with the longest / biggest content sets the size for all the other
     * items and the carousel itself.
     *
     * If set to M.CAROUSEL_SIZE_SURROUNDING_ELEMENT, the surrounding element will
     * determine the size of the carousel.
     *
     * If set to M.CAROUSEL_SIZE_NONE, there will be no special size calculation for
     * the carousel. You will have to take care about this instead.
     *
     * @type Number
     */
    sizeCalculator: M.CAROUSEL_SIZE_CONTENT,

    /**
     * This method renders the basic skeleton of the carousel based on several nested
     * div elements.
     *
     * @private
     * @returns {String} The carousel view's html representation.
     */
    render: function() {
        this.html = '<div id="' + this.id +'" class="tmp-carousel-wrapper">';
        this.html += '<div class="tmp-carousel-scroller">';
        this.html += '<ul class="tmp-carousel-list">';

        if(this.childViews) {
            this.renderChildViews();
        }

        this.html += '</ul>';
        this.html += '</div>';
        this.html += '</div>';

        if(this.showPaginator) {
            this.html += '<div id="' + this.id + '_paginator" class="tmp-carousel-paginator tmp-carousel-paginator-' + this.direction + '"></div>';
        }

        this.html += '<div class="tmp-carousel-clear"></div>';

        return this.html;
    },

    /**
     * This method is responsible for registering events for view elements and its child views. It
     * basically passes the view's event-property to M.EventDispatcher to bind the appropriate
     * events.
     *
     * It extend M.View's registerEvents method with some special stuff for text field views and
     * their internal events.
     */
    registerEvents: function() {
        this.internalEvents = {
            change: {
                target: this,
                action: 'prepareExternalCallback'
            }
        };
        this.bindToCaller(this, M.View.registerEvents)();
    },

    /**
     * This method is called everytime a carousel item is set to active. It will prepare
     * the external callback for the change event and then call it.
     *
     * @private
     * @param {String} id The id of the selected item.
     * @param {Object} event The event.
     * @param {Object} nextEvent The application-side event handler.
     */
    prepareExternalCallback: function(id, event, nextEvent) {
        if(nextEvent) {
            var activeItem = M.ViewManager.getViewById($('#' + this.id + ' .tmp-carousel-list li:nth-child(' + this.activeItem + ')').attr('id'));
            M.EventDispatcher.callHandler(nextEvent, event, NO, [activeItem, this.activeItem - 1]);
        }
    },

    /**
     * This method is called automatically once the bound content changes. It then re-renders the
     * carousel's content.
     *
     * @private
     */
    renderUpdate: function() {
        if(this.contentBinding && this.value) {
            this.removeAllItems();

            /* lets gather the html together */
            var html = '';
            for(var i in this.value) {
                html += this.value[i].render();
            }

            /* set the num of items */
            this.numItems = this.value.length;

            /* add the items to the DOM */
            this.addItems(html);

            /* now the items are in DOM, finally register events */
            for(var i in this.value) {
                this.value[i].theme();
                this.value[i].registerEvents();
            }

            /* no re-theme the carousel (async) */
            var that = this;
            window.setTimeout(function() {
                that.isInitialized = NO;
                that.initThemeUpdate(YES);
            }, 1);
        }
    },

    /**
     * This method adds a given html string, containing the carousel's items, to the DOM.
     *
     * @param {String} item The html representation of the carousel items to be added.
     */
    addItems: function(items) {
        $('#' + this.id + ' .tmp-carousel-list').append(items);
    },

    /**
     * This method removes all of the carousel view's items by removing all of its content in the
     * DOM. This method is based on jQuery's empty().
     */
    removeAllItems: function() {
        /* remove all list items, kill the style and unbind events from list */
        $('#' + this.id + ' .tmp-carousel-list').empty();
        $('#' + this.id + ' .tmp-carousel-list').attr('style', '');
        $('#' + this.id + ' .tmp-carousel-list').unbind();

        /* kill the style and unbind events from scroller */
        $('#' + this.id + ' .tmp-carousel-scroller').attr('style', '');
        $('#' + this.id + ' .tmp-carousel-scroller').unbind();

        /* kill the style and unbind events from wrapper */
        $('#' + this.id).attr('style', '');
        $('#' + this.id).unbind();
    },

    /**
     * This method triggers the render() function on all children of type M.CarouselItemView.
     *
     * @private
     */
    renderChildViews: function() {
        if(this.childViews) {
            var childViews = this.getChildViewsAsArray();

            var numItems = 0;
            for(var i in childViews) {
                var view = this[childViews[i]];
                if(view.type === 'M.CarouselItemView') {
                    view.parentView = this;
                    view._name = childViews[i];
                    this.html += view.render();
                    numItems++;
                } else {
                    M.Logger.log('Invalid child views specified for M.CarouselView. Only M.CarouselItemView accepted.', M.WARN);
                }
            }
            this.numItems = numItems;
        } else if(!this.contentBinding) {
            M.Logger.log('No child views specified for the carousel view.', M.WARN);
        }
    },

    /**
     * This method is responsible for theming and layouting the carousel. We mainly do
     * some calculation based on the device's screen size to position the carousel
     * correctly.
     *
     * @private
     */
    theme: function() {
        var that = this;

        /* if there is no container, something went wrong, so return */
        if(!($('#' + this.id).parent() && $('#' + this.id).parent().length > 0)) {
            return;
        }

        /* if we already called this method 200 times, return */
        if(this.numOfThemeCalls >= 200) {
            return;
        }

        /* if the container is not ready yet, try again in 25ms */
        if(parseInt($('#' + this.id).css('opacity')) > 0 || $('#' + this.id).parent().width() === 0 || $('#' + this.id).parent().width() === this.lastWidth) {
            window.setTimeout(function() {
                that.theme();
            }, 25);
            this.numOfThemeCalls++;
        /* otherwise setup iscroll */
        } else {
            window.setTimeout(function() {
                /* store the last width */
                that.lastWidth = $('#' + that.id).parent().width();

                /* calculate the size of the carousel */
                var width = $('#' + that.id).parent().outerWidth();
                var height = 0;

                if(that.sizeCalculator === M.CAROUSEL_SIZE_CONTENT) {
                    $('#' + that.id + ' ul.tmp-carousel-list li').each(function() {
                        if(height < $(this).outerHeight()) {
                            height = $(this).outerHeight();
                        }
                    });
                } else if(that.sizeCalculator === M.CAROUSEL_SIZE_SURROUNDING_ELEMENT) {
                    height = parseInt($('#' + that.id).parent().css('height'));
                }

                $('#' + that.id).css('width', width);
                $('#' + that.id).css('height', height);
                $('#' + that.id + ' .tmp-carousel-scroller').css('width', (that.direction === M.HORIZONTAL ? width * that.numItems : width));
                $('#' + that.id + ' .tmp-carousel-scroller').css('height', (that.direction === M.VERTICAL ? height * that.numItems : height));
                $('#' + that.id + ' ul.tmp-carousel-list li').css('width', width);
                $('#' + that.id + ' ul.tmp-carousel-list li').css('height', height);

                /* add negative margin for any padding of outer element */
                var margin = {
                    top: -parseInt($('#' + that.id).parent().css('padding-top')),
                    right: -parseInt($('#' + that.id).parent().css('padding-right')),
                    bottom: -parseInt($('#' + that.id).parent().css('padding-bottom')),
                    left: -parseInt($('#' + that.id).parent().css('padding-left'))
                };
                _.each(margin, function(m, key) {
                    switch(key) {
                        case 'top':
                            /* if this is the first child, add negative margin */
                            if($('#' + that.id).parent().children()[0] === $('#' + that.id)[0]) {
                                $('#' + that.id).css('margin-' + key, m);
                            }
                            break;
                        case 'bottom':
                            /* if this is the last child, add negative margin */
                            if($('#' + that.id).parent().children()[$('#' + that.id).parent().children().length - 1] === $('#' + that.id)[0]) {
                                $('#' + that.id).css('margin-' + key, m);
                            }
                            break;
                        default:
                            $('#' + that.id).css('margin-' + key, m);
                            break;
                    }
                });

                if(that.iScroll) {
                    that.iScroll.refresh();
                    that.iScroll.scrollToElement('li:nth-child(' + (that.activeItem > 1 ? that.activeItem : 1) + ')', 100);
                } else {
                    that.iScroll = new iScroll(that.id, {
                        snap: true,
                        momentum: false,
                        hScrollbar: false,
                        vScrollbar: false,
                        onScrollEnd: function() {
                            var nextItem = null;
                            if (that.direction === M.HORIZONTAL) {
                                var width = parseInt($('#' + that.id + ' ul.tmp-carousel-list li').css('width'));
                                nextItem = Math.abs(Math.floor(that.iScroll.x / width)) + 1;
                            } else {
                                var height = parseInt($('#' + that.id + ' ul.tmp-carousel-list li').css('height'));
                                nextItem = Math.abs(Math.ceil(that.iScroll.y / height)) + 1;
                            }

                            /* since triggering the change doesn't work Eddie added this */
                            if (nextItem !== that.activeItem && that.events.change.action !== undefined)
                                that.events.change.action(that.id, nextItem);

                            if (nextItem !== that.activeItem) {
                                $('#' + that.id + '_paginator_' + that.activeItem).removeClass('tmp-carousel-paginator-item-active');
                                that.activeItem = nextItem;
                                $('#' + that.id + '_paginator_' + that.activeItem).addClass('tmp-carousel-paginator-item-active');
                            }

                            /* trigger change event for the button group */
                            $('#' + that.id).trigger('change'); // doesn't work for some reason
                        }
                    });
                }

                /* position and calculate the paginator (async) */
                var paginatorDOM = $('#' + that.id + '_paginator');
                paginatorDOM.css('opacity', 0);
                window.setTimeout(function() {
                    /* render paginator items? */
                    if(!paginatorDOM.html()) {
                        var html = '';
                        for(var i = 1; i <= that.numItems; i++) {
                            html += '<div id="' + that.id + '_paginator_' + i + '" class="tmp-carousel-paginator-item' + (i === that.activeItem ? ' tmp-carousel-paginator-item-active' : '') + '"></div>';
                        }
                        paginatorDOM.html(html);
                    }

                    /* css stuff */
                    if(that.direction === M.HORIZONTAL) {
                        paginatorDOM.css('width', width);
                        paginatorDOM.css('top', $('#' + that.id).position().top + parseInt($('#' + that.id + ' .tmp-carousel-scroller').css('height')) - parseInt($('#' + that.id + '_paginator').css('height')));
                    } else {
                        paginatorDOM.css('top', $('#' + that.id).position().top + (parseInt($('#' + that.id).css('height')) - parseInt(paginatorDOM.height()))/2);
                    }
                    paginatorDOM.css('margin-top', margin['top']);
                    paginatorDOM.animate({
                        opacity: 1
                    }, 100);
                }, 500);

                /* display carousel */
                $('#' + that.id).animate({
                    opacity: 1
                }, 100);

                /* set isInitialized flag to YES */
                that.isInitialized = YES;
            }, 100);
        }
    },

    /**
     * This method is automatically called by the surrounding page once an orientation
     * change event took place.
     *
     * @private
     */
    orientationDidChange: function() {
        this.isInitialized = NO;
        this.initThemeUpdate();
    },

    /**
     * This method is automatically called once there was an event that might require
     * an re-theming of the carousel such as orientation change or page show.
     *
     * @private
     */
    initThemeUpdate: function(initFromScratch) {
        /* if this carousel already is initialized, return */
        if(this.isInitialized) {
            return;
        }

        /* if this is a total refresh, clean some things up */
        if(initFromScratch) {
            this.lastWidth = 0;
            $('#' + this.id + '_paginator').html('');
        }

        /* reset theme counter */
        this.numOfThemeCalls = 0;

        /* hide carousel */
        $('#' + this.id).css('opacity', 0);

        /* hide the paginator (if available) */
        $('#' + this.id + '_paginator').css('opacity', 0);

        /* init the re-theming (but give the carousel some time to get invisible) */
        var that = this;
        window.setTimeout(function() {
            that.theme();
        }, 100)
    },

    /**
     * This method activates one specific item within the carousel.
     *
     * @param {M.CarouselItemView, String} item The item to be set active or its id.
     */
    setActiveItem: function(item) {
        /* get the item based on the given obj or the given id */
        item = typeof(item) === 'string' ? M.ViewManager.getViewById(item) : item;
        if(!(item && item.type === 'M.CarouselItemView')) {
            M.Logger.log('No valid carousel item passed to be set active. Must be either valid id or item object of type M.CarouselItemView.', M.WARN);
            return;
        }

        /* if item is already active, return */
        var activeItem = M.ViewManager.getViewById($('#' + this.id + ' .tmp-carousel-list li:nth-child(' + this.activeItem + ')').attr('id'));
        if(activeItem && activeItem.id === item.id) {
            M.Logger.log('The given carousel item already is active, so we do nothing.', M.INFO);
            return;
        }

        /* set given item active */
        $('#' + this.id + '_paginator_' + this.activeItem).removeClass('tmp-carousel-paginator-item-active');
        this.activeItem = 1;
        var that = this;
        $('#' + this.id + ' .tmp-carousel-list li').each(function() {
            if($(this).attr('id') !== item.id) {
                that.activeItem++;
            } else {
                return false;
            }
        });
        this.iScroll.scrollToElement('li:nth-child(' + (this.activeItem > 1 ? this.activeItem : 1) + ')', 100);
    },

    /**
     * This method activates the next item in the row.
     */
    next: function() {
        var nextItem = $('#' + this.id + ' .tmp-carousel-list li:nth-child(' + this.activeItem + ')').next();
        if(nextItem.length === 0) {
            M.Logger.log('There is no next item available. You already reached the end of the carousel.', M.INFO);
            return;
        }
        this.setActiveItem(M.ViewManager.getViewById(nextItem.attr('id')));
    },

    /**
     * This method activates the previous item in the row.
     */
    prev: function() {
        var prevItem = $('#' + this.id + ' .tmp-carousel-list li:nth-child(' + this.activeItem + ')').prev();
        if(prevItem.length === 0) {
            M.Logger.log('There is no previous item available. You already reached the start of the carousel.', M.INFO);
            return;
        }
        this.setActiveItem(M.ViewManager.getViewById(prevItem.attr('id')));
    }

});

