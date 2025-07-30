/*
 * Copyright 2013 Laurent Bovet <laurent.bovet@windmaster.ch>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var docson = docson || {};

docson.templateBaseUrl="templates";

import $ from 'jquery';
import _ from 'lodash';

const Handlebars  = require('handlebars/dist/handlebars');
import jsonpointer from 'jsonpointer.js';
import marked from 'marked';
import URI from 'urijs';
import traverse from 'traverse';

const debug = require('debug')('docson');

const highlight = false;

    var resolve_ready;
    var ready = new Promise( (resolve,reject) => {
        resolve_ready = resolve;
    });

    var boxTemplate;
    var signatureTemplate;
    var source;
    var stack = [];
    var boxes=[];

    var schemaDocuments = {};

    var resolveRefsReentrant;

    function get_document(url) {
        if( !schemaDocuments[url] ) {
            schemaDocuments[url] = $.get(url).then(function(content){
                if(typeof content != "object") {
                    try {
                        content = JSON.parse(content);
                    } catch(e) {
                        console.error("Unable to parse "+segments[0], e);
                        content = {};
                    }
                }
                return content;
            });

            schemaDocuments[url].then(function(schema){
                resolveRefsReentrant(schema, url );
            })
        }
        return schemaDocuments[url];
    }



    Handlebars.registerHelper('scope', function(schema, options) {
        var result;
        boxes.push([]);
        if(schema && (schema.id || schema.root)) {
            stack.push( schema );
            result = options.fn(this);
            stack.pop();
        } else {
            result = options.fn(this);
        }
        boxes.pop();
        return result;
    });

    Handlebars.registerHelper('source', function(schema) {
        delete schema.root;
        delete schema.__boxId;
        delete schema.__name;
        delete schema.__ref;
        return JSON.stringify(schema, null, 2);
    });

    Handlebars.registerHelper('desc', function(schema) {
        var description = schema.description;
        var examples = schema.examples;

        var text = "";

        if( !description && !examples ) {
            return "";
        }

        if ( description ) {
            text = description
        }

        if ( examples && examples.length > 0 ) {
            text += "\n\n*Examples* \n";
            examples.forEach( e => {
                text += "\n\n