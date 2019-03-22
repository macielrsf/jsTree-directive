
/*
 * jstree.directive [http://www.jstree.com]
 * http://arvindr21.github.io/jsTree-Angular-Directive
 *
 * Copyright (c) 2014 Arvind Ravulavaru
 * Licensed under the MIT license.
 */
/* global $ */
/* global angular */
var ngJSTree = angular.module('jsTree.directive', []);
ngJSTree.directive('jsTree', ['$http', 'Session', function($http, Session) {

  var treeDir = {
    restrict: 'EA',
    fetchResource: function(url, cb) {
      return $http.get(url).then(function(data) {
        if (cb) cb(data.data);
      });
    },
    // Added functionnality for instance: GitHUb #22
    manageInstance: function (s, e, a, config) {
            if (config.treeInstance) {
                // Using the first way to invoke method on instance
                s[config.treeInstance] = this.tree.jstree(true);
            }
        },
    // Added functionnality for tree
    manageId: function (s, e, a, config) {
            if (config.treeId) {
                // Using the first way to invoke method on instance
                s[config.treeId] = this.tree;
            }
        },
    managePlugins: function(s, e, a, config) {
      if (config.plugins || config.treePlugins) {
        // Allow definitions of plugins through array or comma-separated list
        config.plugins = config.plugins || [];
        if(config.treePlugins){
          config.plugins = config.plugins.concat(config.treePlugins.split(','));
        }
        config.core = config.core || {};
        config.core.check_callback = config.core.check_callback || true;

        if (config.plugins.indexOf('state') >= 0) {
          config.state = config.state || {};
          config.state.key = config.treeStateKey;
        }

        if (config.plugins.indexOf('search') >= 0) {
          config.search = config.search || {};
          config.search.show_only_matches = true;
          config.search.show_only_matches_children = true;

          var to = false;
          if (e.next().attr('class') !== 'ng-tree-search') {
            e.after('<input type="text" placeholder="Search Tree" class="ng-tree-search"/>')
              .next()
              .on('keyup', function(ev) {
                if (to) {
                  clearTimeout(to);
                }
                to = setTimeout(function() {
                  treeDir.tree.jstree(true).search(ev.target.value);
                }, 250);
              });
          }
        }

        if (config.plugins.indexOf('checkbox') >= 0) {
          config.checkbox = config.checkbox || {};
          config.checkbox.keep_selected_style = false;
          config.checkbox.tie_selection = false;
          config.checkbox.whole_node = false;
          config.checkbox.cascade = 'down';
          config.checkbox.three_state = false;
        }

        if (config.plugins.indexOf('contextmenu') >= 0) {
          // Context menu is defined with the contextmenu variable
          // treeContextMenu is a string referencing a scope variable, can override the former
          if (config.treeContextmenu) {
            config.contextmenu = {};

            if (config.treeContextmenuaction != undefined) {
              config.contextmenu.items = function(e) {
                return s.$eval(config.treeContextmenuaction)(e);
              };
            } else {
              config.contextmenu.items = function() {
                return s[config.treeContextmenu];
              };
            }
          }
        }

        if (config.plugins.indexOf('types') >= 0) {
          if (config.treeTypes) {
            config.types = JSON.parse(config.treeTypes);
          }
        }

        if (config.plugins.indexOf('dnd') >= 0) {
          if (config.treeDnd) {
            config.dnd = s[config.treeDnd];
            config.dnd.is_draggable = s.permiteDrag;
            config.dnd.check_while_dragging = false;
            config.dnd.copy = false;
            config.dnd.use_htm5 = true;
          }
        }
      }
      return config;
    },
    manageEvents: function(s, e, a, config) {
      // Allow definitions of events through array or comma-separated list
      if (config.events || config.treeEvents) {
        var evMap = config.events || [];
        if(config.treeEvents){
          evMap = evMap.concat(config.treeEvents.split(';'));
        }
        
        for (var i = 0; i < evMap.length; i++) {
          if (evMap[i].length > 0) {
            // plugins could have events with suffixes other than '.jstree'
            var evt = evMap[i].split(':')[0];
            if (evt.indexOf('.') < 0) {
              evt = evt + '.jstree';
            }
            var cb = evMap[i].split(':')[1];
            treeDir.tree.on(evt, s[cb]);
          }
        }
      }
    },
    // Initialisation function
    link: function(s, e, a) { // scope, element, attribute \O/
      $(function() {
        var authorization = '{{token_type}} {{token}}'
          .replace('{{token_type}}', Session.auth.token_type)
          .replace('{{token}}', Session.auth.access_token);

        var config = {};
        // Load a config from the scope
        if (a.treeConfig && s[a.treeConfig] !== undefined) {
          config = s[a.treeConfig];
        }
        delete a.treeConfig;
        delete a.$attr.treeConfig;
        
        if(!config.core){
          config.core = {
            worker: false,
            check_callback: s.checkCallback,
            multiple: true,
            animation: 200,
            error: function(error) {
                $log.error(
                    'treeCtrl: error from js tree - ' + angular.toJson(error)
                );
            }
          };
        }
        // Override with inline statements
        if(Object.keys(a.$attr).length > 0){
          // Only read inline attributes
          for(var _prop in a.$attr){
            config[_prop] = a[_prop];
          }
        }
        
        // // Special treatment to only load core from scope
        // if (a.treeCore) {
        //   config.core = $.extend(config.core, s[a.treeCore]);
        // }
          
        // clean Case
        config.treeData = config.treeData ? config.treeData.toLowerCase() : '';
        config.treeSrc = config.treeSrc ? config.treeSrc.toLowerCase() : '';

        // Specify data directly inside scope
        if(config.core.data){
          treeDir.init(s, e, a, config);
        }else{
          // HTML data
          if (config.treeData == 'html') {
            treeDir.fetchResource(config.treeSrc, function(data) {
              e.html(data);
              treeDir.init(s, e, a, config);
            });
          } else if (config.treeData == 'json') {
            treeDir.fetchResource(config.treeSrc, function(data) {
              config.core.data = data;
              treeDir.init(s, e, a, config);
            });
          } else if (config.treeData == 'scope') {
            s.$watch(config.treeModel, function(n, o) {
              if (n) {
                config.core.data = s[config.treeModel];
                $(e).jstree('destroy');
                treeDir.init(s, e, a, config);
              }
            }, true);
            // Trigger it initally
            // Fix issue #13
            config.core.data = s[config.treeModel];
            treeDir.init(s, e, a, config);
          } else if (config.treeAjax) {
            config.core.data = {
              'url': config.treeAjax,
              'headers': {
                'Authorization': authorization 
              },
              'data': function(node) {
                return {
                  'id': node.id != '#' ? node.id : null
                };
              }
            };
            treeDir.init(s, e, a, config);
          }
        }
      });

    },
    init: function(s, e, a, config) { // scope, element, attribute
      // Load from scope config or inline
      treeDir.managePlugins(s, e, a, config);
      this.tree = $(e).jstree(config);
      treeDir.manageEvents(s, e, a, config);
      // Github #22
      treeDir.manageInstance(s, e, a, config);
      treeDir.manageId(s, e, a, config);
    }
  };

  return treeDir;

}]);
