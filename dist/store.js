"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require("array.prototype.find");

var _rx = require("rx");

var _rx2 = _interopRequireDefault(_rx);

var _ajaxAdapter = require("./ajax-adapter");

var _ajaxAdapter2 = _interopRequireDefault(_ajaxAdapter);

var Store = (function () {
  _createClass(Store, null, [{
    key: "attr",

    /**
     * Creates a field definition for an attribute.
     *
     * @since 0.1.0
     * @param {string} [name] - Name of the property to map this field from.
     * @param {Object} [options] - An options object.
     * @param {string} [options.default] - Default value for this field.
     * @return {Object} - Field definition.
     */
    value: function attr(name, options) {
      if (name && typeof name === 'object') {
        return Store.attr(null, name);
      } else {
        return {
          type: "attr",
          "default": options && options["default"],
          deserialize: function deserialize(data, key) {
            return data.attributes && data.attributes[name || key];
          },
          serialize: function serialize(resource, data, key) {
            data.attributes[name || key] = resource[key];
          }
        };
      }
    }

    /**
     * Creates a field definition for an has-one relationship.
     *
     * @since 0.1.0
     * @param {string} [name] - Name of the property to map this field from.
     * @param {Object} [options] - An options object.
     * @param {string} [options.inverse] - Name of the inverse relationship.
     * @return {Object} - Field definition.
     */
  }, {
    key: "hasOne",
    value: function hasOne(name, options) {
      if (name && typeof name === 'object') {
        return Store.hasOne(null, name);
      } else {
        return {
          type: "has-one",
          inverse: options && options.inverse,
          deserialize: function deserialize(data, key) {
            name = name || key;
            if (data.relationships && data.relationships[name]) {
              if (data.relationships[name].data === null) {
                return null;
              } else if (data.relationships[name].data) {
                return this.find(data.relationships[name].data.type, data.relationships[name].data.id);
              }
            }
          },
          serialize: function serialize(resource, data, key) {
            if (resource[key] === null) {
              data.relationships[name || key] = null;
            } else if (resource[key]) {
              data.relationships[name || key] = {
                data: {
                  type: resource[key].type,
                  id: resource[key].id
                }
              };
            }
          }
        };
      }
    }

    /**
     * Creates a field definition for an has-many relationship.
     *
     * @since 0.1.0
     * @param {string} [name] - Name of the property to map this field from.
     * @param {Object} [options] - An options object.
     * @param {string} [options.inverse] - Name of the inverse relationship.
     * @return {Object} - Field definition.
     */
  }, {
    key: "hasMany",
    value: function hasMany(name, options) {
      if (name && typeof name === 'object') {
        return Store.hasMany(null, name);
      } else {
        return {
          type: "has-many",
          "default": [],
          inverse: options && options.inverse,
          deserialize: function deserialize(data, key) {
            var _this = this;

            name = name || key;
            if (data.relationships && data.relationships[name]) {
              if (data.relationships[name].data === null) {
                return [];
              } else if (data.relationships[name].data) {
                return data.relationships[name].data.map(function (c) {
                  return _this.find(c.type, c.id);
                });
              }
            }
          },
          serialize: function serialize(resource, data, key) {
            if (resource[key]) {
              data.relationships[name || key] = {
                data: resource[key].map(function (x) {
                  return { type: x.type, id: x.id };
                })
              };
            }
          }
        };
      }
    }
  }]);

  function Store(adapter) {
    _classCallCheck(this, Store);

    this._adapter = adapter;
    this._data = {};
    this._subject = new _rx2["default"].Subject();
    this._subscriptions = {};
    this._types = {};

    /**
     * An observable that will emit events when any resource in added, updated
     * or removed. The object passed to listeners will be in this format:
     *
     * <p><pre class="source-code">
     * { name: string, type: string, id: string, resource: object }
     * </pre></p>
     *
     * You can learn more about RxJS observables at the GitHub repo:
     * https://github.com/Reactive-Extensions/RxJS
     *
     * @type {Rx.Observable}
     * @since 0.6.0
     *
     * @example
     * let store = new Store();
     *
     * store.observable.filter(e => e.name === "added").subscribe(event => {
     *   console.log(event.name); // "added"
     *   console.log(event.type); // "products"
     *   console.log(event.id); // "1"
     *   console.log(event.resource); // Map {...}
     * });
     *
     * store.observable.filter(e => e.name === "updated").subscribe(event => {
     *   console.log(event.name); // "updated"
     *   console.log(event.type); // "products"
     *   console.log(event.id); // "1"
     *   console.log(event.resource); // Map {...}
     * });
     *
     * store.observable.filter(e => e.name === "removed").subscribe(event => {
     *   console.log(event.name); // "removed"
     *   console.log(event.type); // "products"
     *   console.log(event.id); // "1"
     *   console.log(event.resource); // null
     * });
     */
    this.observable = this._subject.asObservable();
  }

  /**
   * Add an individual resource to the store. This is used internally by the
   * `push()` method.
   *
   * @since 0.1.0
   * @param {!Object} object - A JSON API Resource Object to be added. See:
            http://jsonapi.org/format/#document-resource-objects
   */

  _createClass(Store, [{
    key: "add",
    value: function add(object) {
      var _this2 = this;

      if (object) {
        if (object.type && object.id) {
          var _ret = (function () {
            var name = _this2._data[object.type] && _this2._data[object.type][object.id] ? "updated" : "added";
            var resource = _this2.find(object.type, object.id);
            var definition = _this2._types[object.type];
            Object.keys(definition).forEach(function (fieldName) {
              if (fieldName[0] !== "_") {
                _this2._addField(object, resource, definition, fieldName);
              }
            });
            _this2._subject.onNext({
              name: name,
              type: object.type,
              id: object.id,
              resource: resource
            });

            return {
              v: object
            };
          })();

          if (typeof _ret === "object") return _ret.v;
        } else {
          throw new TypeError("The data must have a type and id");
        }
      } else {
        throw new TypeError("You must provide data to add");
      }
    }

    /**
     * Converts the given partial into a JSON API compliant representation.
     *
     * @since 0.5.0
     * @param {!string} [type] - The type of the resource. This can be omitted if the partial includes a type property.
     * @param {!string} [id] - The id of the resource. This can be omitted if the partial includes an id property.
     * @param {!object} partial - The data to convert.
     * @return {object} - JSON API version of the object.
     */
  }, {
    key: "convert",
    value: function convert(type, id, partial) {
      var _this3 = this;

      if (type && typeof type === "object") {
        return this.convert(type.type, type.id, type);
      } else if (id && typeof id === "object") {
        return this.convert(type, id.id, id);
      } else {
        var _ret2 = (function () {
          var data = {
            type: type,
            attributes: {},
            relationships: {}
          };
          if (id) {
            data.id = id;
          }
          var definition = _this3._types[data.type];
          Object.keys(definition).forEach(function (fieldName) {
            if (fieldName[0] !== "_") {
              definition[fieldName].serialize(partial, data, fieldName);
            }
          });
          return {
            v: data
          };
        })();

        if (typeof _ret2 === "object") return _ret2.v;
      }
    }

    /**
     * Attempts to create the resource through the adapter and adds it to  the
     * store if successful.
     *
     * @since 0.5.0
     * @param {!string} type - Type of resource.
     * @param {!Object} partial - Data to create the resource with.
     * @param {Object} [options] - Options to pass to the adapter.
     * @return {Rx.Observable}
     *
     * @example
     * let adapter = new Store.AjaxAdapter();
     * let store = new Store(adpater);
     * store.create("product", { title: "A Book" }).subscribe((product) => {
     *   console.log(product.title);
     * });
     */
  }, {
    key: "create",
    value: function create(type, partial, options) {
      if (this._adapter) {
        return this._adapter.create(this, type, partial, options);
      } else {
        throw new Error("Adapter missing. Specify an adapter when creating the store: `var store = new Store(adapter);`");
      }
    }

    /**
     * Defines a type of resource.
     *
     * @since 0.2.0
     * @param {!string|string[]} names - Name(s) of the resource.
     * @param {!Object} definition - The resource's definition.
     */
  }, {
    key: "define",
    value: function define(names, definition) {
      var _this4 = this;

      names = names.constructor === Array ? names : [names];
      if (definition) {
        definition._names = names;
        names.forEach(function (name) {
          if (!_this4._types[name]) {
            _this4._types[name] = definition;
          } else {
            throw new Error("The type '" + name + "' has already been defined.");
          }
        });
      } else {
        throw new Error("You must provide a definition for the type '" + names[0] + "'.");
      }
    }

    /**
     * Attempts to delete the resource through the adapter and removes it from
     * the store if successful.
     *
     * @since 0.5.0
     * @param {!string} type - Type of resource.
     * @param {!string} id - ID of resource.
     * @param {Object} [options] - Options to pass to the adapter.
     * @return {Rx.Observable}
     *
     * @example
     * let adapter = new Store.AjaxAdapter();
     * let store = new Store(adpater);
     * store.destroy("product", "1").subscribe(() => {
     *   console.log("Destroyed!");
     * });
     */
  }, {
    key: "destroy",
    value: function destroy(type, id, options) {
      if (this._adapter) {
        return this._adapter.destroy(this, type, id, options);
      } else {
        throw new Error("Adapter missing. Specify an adapter when creating the store: `var store = new Store(adapter);`");
      }
    }

    /**
     * Finds a resource by type and id.
     *
     * NOTE: If the resource hasn't been loaded via an add() or push() call it
     * will be automatically created when find is called.
     *
     * @since 0.1.0
     * @param {!string} type - Type of the resource to find.
     * @param {!string} id - The id of the resource to find.
     * @return {Object} - The resource.
     */
  }, {
    key: "find",
    value: function find(type, id) {
      var _this5 = this;

      if (type) {
        var _ret3 = (function () {
          var definition = _this5._types[type];
          if (definition) {
            if (!_this5._data[type]) {
              (function () {
                var collection = {};
                definition._names.forEach(function (t) {
                  return _this5._data[t] = collection;
                });
              })();
            }
            if (id) {
              if (!_this5._data[type][id]) {
                _this5._data[type][id] = {
                  _dependents: [],
                  type: type,
                  id: id
                };
                Object.keys(definition).forEach(function (key) {
                  if (key[0] !== "_") {
                    _this5._data[type][id][key] = definition[key]["default"];
                  }
                });
              }
              return {
                v: _this5._data[type][id]
              };
            } else {
              // throw new TypeError(`You must provide an id`);
              /*eslint-disable*/
              console.warn(["Using the `store.find()` method to find an entire collection has been deprecated in favour of `store.findAll()`.", "For more information see: https://github.com/haydn/json-api-store/releases/tag/v0.7.0"].join("\n"));
              /*eslint-enable*/
              return {
                v: _this5.findAll(type)
              };
            }
          } else {
            throw new TypeError("Unknown type '" + type + "'");
          }
        })();

        if (typeof _ret3 === "object") return _ret3.v;
      } else {
        throw new TypeError("You must provide a type");
      }
    }

    /**
     * Finds all the resources of a given type.
     *
     * @since 0.7.0
     * @param {!string} type - Type of the resource to find.
     * @return {Object[]} - An array of resources.
     */
  }, {
    key: "findAll",
    value: function findAll(type) {
      var _this6 = this;

      if (type) {
        var definition = this._types[type];
        if (definition) {
          if (!this._data[type]) {
            (function () {
              var collection = {};
              definition._names.forEach(function (t) {
                return _this6._data[t] = collection;
              });
            })();
          }
          return Object.keys(this._data[type]).map(function (x) {
            return _this6._data[type][x];
          });
        } else {
          throw new TypeError("Unknown type '" + type + "'");
        }
      } else {
        throw new TypeError("You must provide a type");
      }
    }

    /**
     * Attempts to load the given resource through the adapter and adds it to the
     * store if successful.
     *
     * @since 0.5.0
     * @param {!string} type - Type of resource.
     * @param {!string} id - ID of resource.
     * @param {Object} [options] - Options to pass to the adapter.
     * @return {Rx.Observable}
     *
     * @example
     * let adapter = new Store.AjaxAdapter();
     * let store = new Store(adpater);
     * store.load("products", "1").subscribe((product) => {
     *   console.log(product.title);
     * });
     */
  }, {
    key: "load",
    value: function load(type, id, options) {
      if (!id || typeof id === "object") {
        /*eslint-disable*/
        console.warn(["Using the `store.load()` method to load an entire collection has been deprecated in favour of `store.loadAll()`.", "For more information see: https://github.com/haydn/json-api-store/releases/tag/v0.7.0"].join("\n"));
        /*eslint-enable*/
      }
      if (this._adapter) {
        return this._adapter.load(this, type, id, options);
      } else {
        throw new Error("Adapter missing. Specify an adapter when creating the store: `var store = new Store(adapter);`");
      }
    }

    /**
     * Attempts to load all the resources of the given type through the adapter
     * and adds them to the store if successful.
     *
     * @since 0.7.0
     * @param {!string} type - Type of resource.
     * @param {Object} [options] - Options to pass to the adapter.
     * @return {Rx.Observable}
     *
     * @example
     * let adapter = new Store.AjaxAdapter();
     * let store = new Store(adpater);
     * store.loadAll("products").subscribe((products) => {
     *   console.log(products);
     * });
     */
  }, {
    key: "loadAll",
    value: function loadAll(type, options) {
      if (this._adapter) {
        return this._adapter.load(this, type, null, options);
      } else {
        throw new Error("Adapter missing. Specify an adapter when creating the store: `var store = new Store(adapter);`");
      }
    }

    /**
     * Unregister an event listener that was registered with on().
     *
     * @deprecated Use the <code>store.observable</code> property instead of this.
     * @since 0.4.0
     * @param {string} event - Name of the event.
     * @param {string} type - Name of resource to originally passed to on().
     * @param {string} [id] - ID of the resource to originally passed to on().
     * @param {function} callback - Function originally passed to on().
     */
  }, {
    key: "off",
    value: function off(event, type, id, callback) {
      /*eslint-disable*/
      console.warn(["The `store.off()` method has been deprecated in favour of `store.observable`.", "For more information see: https://github.com/haydn/json-api-store/releases/tag/v0.6.0"].join("\n"));
      /*eslint-enable*/
      if (event === "added" || event === "updated" || event === "removed") {
        if (this._types[type]) {
          if (id && ({}).toString.call(id) === '[object Function]') {
            this.off.call(this, event, type, null, id, callback);
          } else if (this._subscriptions[event] && this._subscriptions[event][type] && this._subscriptions[event][type][id || "*"]) {
            this._subscriptions[event][type][id || "*"].dispose();
            delete this._subscriptions[event][type][id || "*"];
          }
        } else {
          throw new Error("Unknown type '" + type + "'");
        }
      } else {
        throw new Error("Unknown event '" + event + "'");
      }
    }

    /**
     * Register an event listener: "added", "updated" or "removed".
     *
     * @deprecated Use the <code>store.observable</code> property instead of this.
     * @since 0.4.0
     * @param {string} event - Name of the event.
     * @param {string} type - Name of resource to watch.
     * @param {string} [id] - ID of the resource to watch.
     * @param {function} callback - Function to call when the event occurs.
     * @param {Object} [context] - Context in which to call the callback.
     */
  }, {
    key: "on",
    value: function on(event, type, id, callback, context) {
      var _this7 = this;

      /*eslint-disable*/
      console.warn(["The `store.on()` method has been deprecated in favour of `store.observable`.", "For more information see: https://github.com/haydn/json-api-store/releases/tag/v0.6.0"].join("\n"));
      /*eslint-enable*/
      if (event === "added" || event === "updated" || event === "removed") {
        if (this._types[type]) {
          if (id && ({}).toString.call(id) === '[object Function]') {
            this.on.call(this, event, type, null, id, callback);
          } else if (!this._subscriptions[event] || !this._subscriptions[event][type] || !this._subscriptions[event][type][id || "*"]) {
            var subscription = this._subject.filter(function (e) {
              return e.name === event;
            });
            subscription = subscription.filter(function (e) {
              return _this7._types[type]._names.indexOf(e.type) !== -1;
            });
            if (id) {
              subscription = subscription.filter(function (e) {
                return e.id === id;
              });
            }
            subscription = subscription.map(function (e) {
              return _this7.find(e.type, e.id);
            });
            this._subscriptions[event] = this._subscriptions[event] || {};
            if (!this._subscriptions[event][type]) {
              (function () {
                var obj = {};
                _this7._types[type]._names.forEach(function (type) {
                  _this7._subscriptions[event][type] = obj;
                });
              })();
            }
            this._subscriptions[event][type][id || "*"] = subscription.subscribe(callback.bind(context));
          }
        } else {
          throw new Error("Unknown type '" + type + "'");
        }
      } else {
        throw new Error("Unknown event '" + event + "'");
      }
    }

    /**
     * Add a JSON API response to the store. This method can be used to handle a
     * successful GET or POST response from the server.
     *
     * @since 0.1.0
     * @param {Object} root - Top Level Object to push. See:
                              http://jsonapi.org/format/#document-top-level
     */
  }, {
    key: "push",
    value: function push(root) {
      var _this8 = this;

      if (root.data.constructor === Array) {
        return root.data.map(function (x) {
          return results.push(_this8.add(x));
        });
      } else {
        return this.add(root.data);
      }
      if (root.included) {
        return root.included.map(function (x) {
          return _this8.add(x);
        });
      }
    }

    /**
     * Remove a resource or collection of resources from the store.
     *
     * @since 0.1.0
     * @param {!string} type - Type of the resource(s) to remove.
     * @param {string} [id] - The id of the resource to remove. If omitted all
     *                        resources of the type will be removed.
     */
  }, {
    key: "remove",
    value: function remove(type, id) {
      var _this9 = this;

      if (type) {
        if (this._types[type]) {
          if (id) {
            var resource = this._data[type] && this._data[type][id];
            if (resource) {
              this._remove(resource);
              this._subject.onNext({
                name: "removed",
                type: type,
                id: id,
                resource: null
              });
            }
          } else {
            Object.keys(this._data[type]).forEach(function (id) {
              return _this9.remove(type, id);
            });
          }
        } else {
          throw new TypeError("Unknown type '" + type + "'");
        }
      } else {
        throw new TypeError("You must provide a type to remove");
      }
    }

    /**
     * Attempts to update the resource through the adapter and updates it in  the
     * store if successful.
     *
     * @since 0.5.0
     * @param {!string} type - Type of resource.
     * @param {!string} id - ID of resource.
     * @param {!Object} partial - Data to update the resource with.
     * @param {Object} [options] - Options to pass to the adapter.
     * @return {Rx.Observable}
     *
     * @example
     * let adapter = new Store.AjaxAdapter();
     * let store = new Store(adpater);
     * store.update("product", "1", { title: "foo" }).subscribe((product) => {
     *   console.log(product.title);
     * });
     */
  }, {
    key: "update",
    value: function update(type, id, partial, options) {
      if (this._adapter) {
        return this._adapter.update(this, type, id, partial, options);
      } else {
        throw new Error("Adapter missing. Specify an adapter when creating the store: `var store = new Store(adapter);`");
      }
    }
  }, {
    key: "_addField",
    value: function _addField(object, resource, definition, fieldName) {
      var _this10 = this;

      var field = definition[fieldName];
      var newValue = field.deserialize.call(this, object, fieldName);
      if (typeof newValue !== "undefined") {
        if (field.type === "has-one") {
          if (resource[fieldName]) {
            this._removeInverseRelationship(resource, fieldName, resource[fieldName], field);
          }
          if (newValue) {
            this._addInverseRelationship(resource, fieldName, newValue, field);
          }
        } else if (field.type === "has-many") {
          resource[fieldName].forEach(function (r) {
            if (resource[fieldName].indexOf(r) !== -1) {
              _this10._removeInverseRelationship(resource, fieldName, r, field);
            }
          });
          newValue.forEach(function (r) {
            _this10._addInverseRelationship(resource, fieldName, r, field);
          });
        }
        resource[fieldName] = newValue;
      }
    }
  }, {
    key: "_addInverseRelationship",
    value: function _addInverseRelationship(sourceResource, sourceFieldName, targetResource, sourceField) {
      var targetDefinition = this._types[targetResource.type];
      var sourceDefinition = this._types[sourceResource.type];
      if (targetDefinition) {
        var targetFieldName = [sourceField.inverse].concat(sourceDefinition._names).find(function (x) {
          return targetDefinition[x];
        });
        var targetField = targetDefinition && targetDefinition[targetFieldName];
        targetResource._dependents.push({ type: sourceResource.type, id: sourceResource.id, fieldName: sourceFieldName });
        if (targetField) {
          if (targetField.type === "has-one") {
            sourceResource._dependents.push({ type: targetResource.type, id: targetResource.id, fieldName: targetFieldName });
            targetResource[targetFieldName] = sourceResource;
          } else if (targetField.type === "has-many") {
            sourceResource._dependents.push({ type: targetResource.type, id: targetResource.id, fieldName: targetFieldName });
            if (targetResource[targetFieldName].indexOf(sourceResource) === -1) {
              targetResource[targetFieldName].push(sourceResource);
            }
          } else if (targetField.type === "attr") {
            throw new Error("The the inverse relationship for '" + sourceFieldName + "' is an attribute ('" + targetFieldName + "')");
          }
        } else if (sourceField.inverse) {
          throw new Error("The the inverse relationship for '" + sourceFieldName + "' is missing ('" + sourceField.inverse + "')");
        }
      }
    }
  }, {
    key: "_remove",
    value: function _remove(resource) {
      var _this11 = this;

      resource._dependents.forEach(function (dependent) {
        var dependentResource = _this11._data[dependent.type][dependent.id];
        switch (_this11._types[dependent.type][dependent.fieldName].type) {
          case "has-one":
            {
              dependentResource[dependent.fieldName] = null;
              break;
            }
          case "has-many":
            {
              var index = dependentResource[dependent.fieldName].indexOf(resource);
              if (index !== -1) {
                dependentResource[dependent.fieldName].splice(index, 1);
              }
              break;
            }
          default:
            {
              break;
            }
        }
        // TODO: This only needs to be run once for each dependent.
        dependentResource._dependents = dependentResource._dependents.filter(function (d) {
          return !(d.type === resource.type && d.id === resource.id);
        });
      });
      delete this._data[resource.type][resource.id];
    }
  }, {
    key: "_removeInverseRelationship",
    value: function _removeInverseRelationship(sourceResource, sourceFieldName, targetResource, sourceField) {
      var targetDefinition = this._types[targetResource.type];
      var targetFieldName = sourceField.inverse || sourceResource.type;
      var targetField = targetDefinition && targetDefinition[targetFieldName];
      targetResource._dependents = targetResource._dependents.filter(function (r) {
        return !(r.type === sourceResource.type && r.id === sourceResource.id && r.fieldName === sourceFieldName);
      });
      if (targetField) {
        if (targetField.type === "has-one") {
          sourceResource._dependents = sourceResource._dependents.filter(function (r) {
            return !(r.type === targetResource.type && r.id === targetResource.id && r.fieldName === targetFieldName);
          });
          targetResource[targetFieldName] = null;
        } else if (targetField.type === "has-many") {
          sourceResource._dependents = sourceResource._dependents.filter(function (r) {
            return !(r.type === targetResource.type && r.id === targetResource.id && r.fieldName === targetFieldName);
          });
          targetResource[targetFieldName] = targetResource[targetFieldName].filter(function (r) {
            return r !== sourceResource;
          });
        } else if (targetField.type === "attr") {
          throw new Error("The the inverse relationship for '" + sourceFieldName + "' is an attribute ('" + targetFieldName + "')");
        }
      } else if (sourceField.inverse) {
        throw new Error("The the inverse relationship for '" + sourceFieldName + "' is missing ('" + sourceField.inverse + "')");
      }
    }
  }]);

  return Store;
})();

exports["default"] = Store;

Store.Rx = _rx2["default"];
Store.AjaxAdapter = _ajaxAdapter2["default"];
module.exports = exports["default"];
