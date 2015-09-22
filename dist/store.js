"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require("array.prototype.find");

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
          }
        };
      }
    }
  }]);

  function Store() {
    _classCallCheck(this, Store);

    this._collectionListeners = { "added": {}, "updated": {}, "removed": {} };
    this._data = {};
    this._resourceListeners = { "added": {}, "updated": {}, "removed": {} };
    this._types = {};
  }

  /**
   * Add an individual resource to the store. This is used internally by the
   * `push()` method.
   *
   * @since 0.1.0
   * @param {!Object} object - Resource Object to add. See:
            http://jsonapi.org/format/#document-resource-objects
   * @return {undefined} - Nothing.
   */

  _createClass(Store, [{
    key: "add",
    value: function add(object) {
      var _this2 = this;

      if (object) {
        if (object.type && object.id) {
          (function () {
            var event = _this2._data[object.type] && _this2._data[object.type][object.id] ? "updated" : "added";
            var resource = _this2.find(object.type, object.id);
            var definition = _this2._types[object.type];
            Object.keys(definition).forEach(function (fieldName) {
              if (fieldName[0] !== "_") {
                _this2._addField(object, resource, definition, fieldName);
              }
            });
            if (_this2._resourceListeners[event][object.type] && _this2._resourceListeners[event][object.type][object.id]) {
              _this2._resourceListeners[event][object.type][object.id].forEach(function (x) {
                return x[0].call(x[1], resource);
              });
            }
            if (_this2._collectionListeners[event][object.type]) {
              _this2._collectionListeners[event][object.type].forEach(function (x) {
                return x[0].call(x[1], resource);
              });
            }
          })();
        } else {
          throw new TypeError("The data must have a type and id");
        }
      } else {
        throw new TypeError("You must provide data to add");
      }
    }

    /**
     * Defines a type of resource.
     *
     * @since 0.2.0
     * @param {!string|string[]} names - Name(s) of the resource.
     * @param {!Object} definition - The resource's definition.
     * @return {undefined} - Nothing.
     */
  }, {
    key: "define",
    value: function define(names, definition) {
      var _this3 = this;

      names = names.constructor === Array ? names : [names];
      definition._names = names;
      names.forEach(function (name) {
        if (!_this3._types[name]) {
          _this3._types[name] = definition;
        } else {
          throw new Error("The type '" + name + "' has already been defined.");
        }
      });
    }

    /**
     * Find a resource or entire collection of resources.
     *
     * NOTE: If the resource hasn't been loaded via an add() or push() call it
     * will be automatically created when find is called.
     *
     * @since 0.1.0
     * @param {!string} type - Type of the resource(s) to find.
     * @param {string} [id] - The id of the resource to find. If omitted all
     *                        resources of the type will be returned.
     * @return {Object|Object[]} - Either the resource or an array of resources.
     */
  }, {
    key: "find",
    value: function find(type, id) {
      var _this4 = this;

      if (type) {
        var _ret2 = (function () {
          var definition = _this4._types[type];
          if (definition) {
            if (!_this4._data[type]) {
              (function () {
                var collection = {};
                definition._names.forEach(function (t) {
                  return _this4._data[t] = collection;
                });
              })();
            }
            if (id) {
              if (!_this4._data[type][id]) {
                _this4._data[type][id] = {
                  _dependents: [],
                  type: type,
                  id: id
                };
                Object.keys(definition).forEach(function (key) {
                  if (key[0] !== "_") {
                    _this4._data[type][id][key] = definition[key]["default"];
                  }
                });
              }
              return {
                v: _this4._data[type][id]
              };
            } else {
              return {
                v: Object.keys(_this4._data[type]).map(function (x) {
                  return _this4._data[type][x];
                })
              };
            }
          } else {
            throw new TypeError("Unknown type '" + type + "'");
          }
        })();

        if (typeof _ret2 === "object") return _ret2.v;
      } else {
        throw new TypeError("You must provide a type");
      }
    }

    /**
     * Unregister an event listener that was registered with on().
     *
     * @since 0.4.0
     * @param {string} event - Name of the event.
     * @param {string} type - Name of resource to originally passed to on().
     * @param {string} [id] - ID of the resource to originally passed to on().
     * @param {function} callback - Function originally passed to on().
     * @return {undefined} - Nothing.
     */
  }, {
    key: "off",
    value: function off(event, type, id, callback) {
      var _this5 = this;

      if (this._resourceListeners[event] && this._collectionListeners[event]) {
        if (this._types[type]) {
          if (id && ({}).toString.call(id) === '[object Function]') {
            this.off.call(this, event, type, null, id, callback);
          } else {
            // TODO: Performance-wise, this can be made way better. There shouldn't be a need to maintain separate lists.
            this._types[type]._names.forEach(function (type) {
              if (id) {
                if (_this5._resourceListeners[event][type] && _this5._resourceListeners[event][type][id]) {
                  _this5._resourceListeners[event][type][id] = _this5._resourceListeners[event][type][id].filter(function (x) {
                    return x[0] !== callback;
                  });
                }
              } else if (_this5._collectionListeners[event][type]) {
                _this5._collectionListeners[event][type] = _this5._collectionListeners[event][type].filter(function (x) {
                  return x[0] !== callback;
                });
              }
            });
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
     * @since 0.4.0
     * @param {string} event - Name of the event.
     * @param {string} type - Name of resource to watch.
     * @param {string} [id] - ID of the resource to watch.
     * @param {function} callback - Function to call when the event occurs.
     * @param {Object} [context] - Context in which to call the callback.
     * @return {undefined} - Nothing.
     */
  }, {
    key: "on",
    value: function on(event, type, id, callback, context) {
      var _this6 = this;

      if (this._resourceListeners[event] && this._collectionListeners[event]) {
        if (this._types[type]) {
          if (id && ({}).toString.call(id) === '[object Function]') {
            this.on.call(this, event, type, null, id, callback);
          } else {
            // TODO: Performance-wise, this can be made way better. There shouldn't be a need to maintain separate lists.
            this._types[type]._names.forEach(function (type) {
              if (id) {
                _this6._resourceListeners[event][type] = _this6._resourceListeners[event][type] || {};
                _this6._resourceListeners[event][type][id] = _this6._resourceListeners[event][type][id] || [];
                if (!_this6._resourceListeners[event][type][id].find(function (x) {
                  return x[0] === callback;
                })) {
                  _this6._resourceListeners[event][type][id].push([callback, context]);
                }
              } else {
                _this6._collectionListeners[event][type] = _this6._collectionListeners[event][type] || [];
                if (!_this6._collectionListeners[event][type].find(function (x) {
                  return x[0] === callback;
                })) {
                  _this6._collectionListeners[event][type].push([callback, context]);
                }
              }
            });
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
     * @return {undefined} - Nothing.
     */
  }, {
    key: "push",
    value: function push(root) {
      var _this7 = this;

      if (root.data.constructor === Array) {
        root.data.forEach(function (x) {
          return _this7.add(x);
        });
      } else {
        this.add(root.data);
      }
      if (root.included) {
        root.included.forEach(function (x) {
          return _this7.add(x);
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
     * @return {undefined} - Nothing.
     */
  }, {
    key: "remove",
    value: function remove(type, id) {
      var _this8 = this;

      if (type) {
        if (this._types[type]) {
          if (id) {
            (function () {
              var resource = _this8._data[type][id];
              if (resource) {
                _this8._remove(resource);
                if (_this8._resourceListeners["removed"][type] && _this8._resourceListeners["removed"][type][id]) {
                  _this8._resourceListeners["removed"][type][id].forEach(function (x) {
                    return x[0].call(x[1], resource);
                  });
                }
                if (_this8._collectionListeners["removed"][type]) {
                  _this8._collectionListeners["removed"][type].forEach(function (x) {
                    return x[0].call(x[1], resource);
                  });
                }
              }
            })();
          } else {
            Object.keys(this._data[type]).forEach(function (id) {
              return _this8.remove(type, id);
            });
          }
        } else {
          throw new TypeError("Unknown type '" + type + "'");
        }
      } else {
        throw new TypeError("You must provide a type to remove");
      }
    }
  }, {
    key: "_addField",
    value: function _addField(object, resource, definition, fieldName) {
      var _this9 = this;

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
              _this9._removeInverseRelationship(resource, fieldName, r, field);
            }
          });
          newValue.forEach(function (r) {
            _this9._addInverseRelationship(resource, fieldName, r, field);
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
      var _this10 = this;

      resource._dependents.forEach(function (dependent) {
        var dependentResource = _this10._data[dependent.type][dependent.id];
        switch (_this10._types[dependent.type][dependent.fieldName].type) {
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
module.exports = exports["default"];
