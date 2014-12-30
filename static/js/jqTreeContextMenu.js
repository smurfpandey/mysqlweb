(function ($) {
	if (!$.fn.tree) {
		throw "Error jqTree is not loaded.";
	}

	$.fn.jqTreeContextMenu = function (menuElement, callbacks) {
		//
		// TODO:
		// * Different menu for different node type
		//

		var self = this;
		var $el = this;
		var menuFadeDuration = 250;
		var menuType = '';
		var $menuEl;

		//Check if useContextMenu option is set
		var jqTree = $el.data('simple_widget_tree');
		var isContextTrue = jqTree.options.useContextMenu;

		if(!isContextTrue){
			throw 'Error: useContextMenu is set as false. Set it true in options before using contextmenu.';
		}

		// Check if the parameter is a jquery object
		if(menuElement instanceof jQuery){
			//This is a jQuery object.
			//Same menu for complete tree
			menuType = 'SINGLE';
			$menuEl = menuElement;

			// Hide the menu div.
			$menuEl.hide();
		}
		else if (menuElement instanceof Array) {
			//Diff menu for diff node
			menuType = 'MULTI';
		}
		else {
			//Awww! We don't know what kind of input is this
			throw 'Error: Input parameters are incorrect';
		}

		// This hash holds all menu items that should be disabled for a specific node.
		var nodeToDisabledMenuItems = {};

		// Disable system context menu from being displayed.
		//This is being handled by latest version of jqTree atleast.
		// $el.bind("contextmenu", function (e) {
		// 	e.preventDefault();
		// 	return false;
		// });

		var hideOldMenu = function($oldMenu) {
			if($oldMenu instanceof jQuery){
				$oldMenu.fadeOut(menuFadeDuration);
			}
		}

		// Handle the contextmenu event sent from jqTree when user clicks right mouse button.
		$el.bind('tree.contextmenu', function (event) {
			var x = event.click_event.pageX;
			var y = event.click_event.pageY;
			var yPadding = 5;
			var xPadding = 5;

			//If type of menu is SINGLE, show the menuEl,
			//Else we need to get the menuEl of this particular node
			switch (menuType){
				case 'MULTI':{

						//Hide the previous which is being displayed
						var $oldMenu = $menuEl;
						// if($menuEl instanceof jQuery){
						// 	//deselect everyone
						// 	$el.tree('selectNode', null);
						// }

						//Check if menu differentiation is based on id, type or name
						var firstObj = menuElement[0];
						var diffKey = '';
						if(firstObj.hasOwnProperty('id')) {
							diffKey = 'id';
						}
						else if (firstObj.hasOwnProperty('type')) {
							diffKey = 'type';
						}
						else if (firstObj.hasOwnProperty('name')) {
							diffKey = 'name';
						}

						var nodeValue = event.node[diffKey];
						if(typeof(nodeValue) === 'undefined'){
							hideOldMenu($oldMenu);
							return;
						}

						//Get id of the current node
						//jQuery method
						var result = $.grep(menuElement, function(e){ return e[diffKey] == nodeValue; });

						if(result.length === 0){
							//No menu defined for this node
							//We better hide the old one too
							hideOldMenu($oldMenu);
							return;
						}
						else {
							$menuEl = result[0].menu_element;
						}

						if(!$menuEl.is($oldMenu)){
							hideOldMenu($oldMenu);
						}

					break;
				}
			}

			var menuHeight = $menuEl.height();
			var menuWidth = $menuEl.width();
			var windowHeight = $(window).height();
			var windowWidth = $(window).width();

			if (menuHeight + y + yPadding > windowHeight) {
				// Make sure the whole menu is rendered within the viewport.
				y = y - menuHeight;
			}
			if (menuWidth + x + xPadding > windowWidth) {
				// Make sure the whole menu is rendered within the viewport.
				x = x - menuWidth;
			}

			// Handle disabling and enabling of menu items on specific nodes.
			if (Object.keys(nodeToDisabledMenuItems).length > 0) {
				if (event.node.name in nodeToDisabledMenuItems) {
					var nodeName = event.node.name;
					var items = nodeToDisabledMenuItems[nodeName];
					if (items.length === 0) {
						$menuEl.find('li').addClass('disabled');
						$menuEl.find('li > a').unbind('click');
					} else {
						$menuEl.find('li > a').each(function () {
							$(this).closest('li').removeClass('disabled');
							var hrefValue = $(this).attr('href');
							var value = hrefValue.slice(hrefValue.indexOf("#") + 1, hrefValue.length)
							if ($.inArray(value, items) > -1) {
								$(this).closest('li').addClass('disabled');
								$(this).unbind('click');
							}
						});
					}
				} else {
					$menuEl.find('li.disabled').removeClass('disabled');
				}
			}

			// Must call show before we set the offset (offset can not be set on display: none elements).
			$menuEl.fadeIn(menuFadeDuration);

			$menuEl.offset({ left: x, top: y });

			var dismissContextMenu = function () {
				$(document).unbind('click.jqtreecontextmenu');
				$el.unbind('tree.click.jqtreecontextmenu');
				$menuEl.fadeOut(menuFadeDuration);
			}
			// Make it possible to dismiss context menu by clicking somewhere in the document.
			$(document).bind('click.jqtreecontextmenu', function () {
				dismissContextMenu();
			});

			// Dismiss context menu if another node in the tree is clicked.
			$el.bind('tree.click.jqtreecontextmenu', function (e) {
				dismissContextMenu();
			});

			// Make selection follow the node that was right clicked on.
			// var selectedNode = $el.tree('getSelectedNode');
			// if (selectedNode !== event.node) {
			// 	$el.tree('selectNode', event.node);
			// }

			// Handle click on menu items, if it's not disabled.
			var menuItems = $menuEl.find('li:not(.disabled) a');
			if (menuItems.length !== 0) {
				menuItems.unbind('click');
				menuItems.click(function (e) {
					e.stopImmediatePropagation();
					dismissContextMenu();
					var hrefAnchor = e.currentTarget.attributes.href.nodeValue;
					var funcKey = hrefAnchor.slice(hrefAnchor.indexOf("#") + 1, hrefAnchor.length)
					var callbackFn = callbacks[funcKey];
					if (callbackFn) {
						callbackFn(event.node);
					}
					return false;
				});
			}
		});

		this.disable = function () {
			if (arguments.length === 0) {
				// Called as: api.disable()
				$menuEl.find('li:not(.disabled)').addClass('disabled');
				$menuEl.find('li a').unbind('click');
				nodeToDisabledMenuItems = {};
			} else if (arguments.length === 1) {
				// Called as: api.disable(['edit','remove'])
				var items = arguments[0];
				if (typeof items !== 'object') {
					return;
				}
				$menuEl.find('li > a').each(function () {
					var hrefValue = $(this).attr('href');
					var value = hrefValue.slice(hrefValue.indexOf("#") + 1, hrefValue.length)
					if ($.inArray(value, items) > -1) {
						$(this).closest('li').addClass('disabled');
						$(this).unbind('click');
					}
				});
				nodeToDisabledMenuItems = {};
			} else if (arguments.length === 2) {
				// Called as: api.disable(nodeName, ['edit','remove'])
				var nodeName = arguments[0];
				var items = arguments[1];
				nodeToDisabledMenuItems[nodeName] = items;
			}
		};

		this.enable = function () {
			if (arguments.length === 0) {
				// Called as: api.enable()
				$menuEl.find('li.disabled').removeClass('disabled');
				nodeToDisabledMenuItems = {};
			} else if (arguments.length === 1) {
				// Called as: api.enable(['edit','remove'])
				var items = arguments[0];
				if (typeof items !== 'object') {
					return;
				}

				$menuEl.find('li > a').each(function () {
					var hrefValue = $(this).attr('href');
					var value = hrefValue.slice(hrefValue.indexOf("#") + 1, hrefValue.length)
					if ($.inArray(value, items) > -1) {
						$(this).closest('li').removeClass('disabled');
					}
				});

				nodeToDisabledMenuItems = {};
			} else if (arguments.length === 2) {
				// Called as: api.enable(nodeName, ['edit','remove'])
				var nodeName = arguments[0];
				var items = arguments[1];
				if (items.length === 0) {
					delete nodeToDisabledMenuItems[nodeName];
				} else {
					var disabledItems = nodeToDisabledMenuItems[nodeName];
					for (var i = 0; i < items.length; i++) {
						var idx = disabledItems.indexOf(items[i]);
						if (idx > -1) {
							disabledItems.splice(idx, 1);
						}
					}
					if (disabledItems.length === 0) {
						delete nodeToDisabledMenuItems[nodeName];
					} else {
						nodeToDisabledMenuItems[nodeName] = disabledItems;
					}
				}
				if (Object.keys(nodeToDisabledMenuItems).length === 0) {
					$menuEl.find('li.disabled').removeClass('disabled');
				}
			}
		};
		return this;
	};
} (jQuery));
