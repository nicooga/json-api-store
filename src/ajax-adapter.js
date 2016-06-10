import ajax from "./ajax";
import param from "jquery-param";
import Rx from 'rx';
import Cookies from "js-cookie";

export default class AjaxAdapter {
  constructor(options) {
    if (options && Rx.Observable.isObservable(options))
      options.subscribe(this.setOptions.bind(this))
    else this.setOptions(options);
  };

  setOptions(options){
    this._base = (options && options.base) || "";
    this._headers = (options && options.headers) || "";
  }

  create(store, type, partial, options) {

    if (!store._types[type]) {
      throw new Error(`Unknown type '${type}'`);
    }

    let source = ajax({
      body: JSON.stringify({
        data: store.convert(type, partial)
      }),
      crossDomain: true,
      headers: this._mergedHeaders(headers),
      method: "POST",
      responseType: "auto",
      url: this._getUrl(type, null, options)
    }).do(e => store.push(e.response))
      .map(e => store.find(e.response.data.type, e.response.data.id))
      .publish();

    source.connect();

    return source;

  }

  destroy(store, type, id, options) {

    if (!store._types[type]) {
      throw new Error(`Unknown type '${type}'`);
    }

    let source = ajax({
      crossDomain: true,
      headers: Object.assign({
        "Content-Type": "application/vnd.api+json"
      }, this._headers),
      method: "DELETE",
      responseType: "auto",
      url: this._getUrl(type, id, options)
    }).do(() => store.remove(type, id))
      .publish();

    source.connect();

    return source;

  }

  load(store, type, id, options) {

    if (id && typeof id === "object") {
      return this.load(store, type, null, id);
    }

    if (!store._types[type]) {
      throw new Error(`Unknown type '${type}'`);
    }

    let source = ajax({
      crossDomain: true,
      headers: this._mergedHeaders(),
      method: "GET",
      responseType: "auto",
      url: this._getUrl(type, id, options)
    }).do(e => store.push(e.response))
      .map(() => id ? store.find(type, id) : store.findAll(type))
      .publish();

    source.connect();

    return source;

  }

  update(store, type, id, partial, options) {

    if (!store._types[type]) {
      throw new Error(`Unknown type '${type}'`);
    }

    let data = store.convert(type, id, partial);

    let source = ajax({
      body: JSON.stringify({
        data: data
      }),
      crossDomain: true,
      headers: this._mergedHeaders(),
      method: "PATCH",
      responseType: "auto",
      url: this._getUrl(type, id, options)
    }).do(() => store.add(data))
      .map(() => store.find(type, id))
      .publish();

    source.connect();

    return source;

  }

  _getUrl(type, id, options) {

    let url = id ? `${this._base}/${type}/${id}` : `${this._base}/${type}`;

    if (options) {
      url = `${url}?${param(options)}`;
    }

    return url;

  }

  _mergedHeaders(headers) {
    return {
      "Content-Type": "application/vnd.api+json",
      "X-XSRF-TOKEN": Cookies.get("XSRF-TOKEN"),
      ...this._headers
    };
  }
}
