"use strict";

var vows = require("vows");
var assert = require("assert");

var hub = require("./lib/hub");

vows.describe("Yeti Functional").addBatch(hub.functionalContext({
    "visits Yeti": {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("Timed out."));
                }, 500);

                lastTopic.client.once("agentConnect", function (session, agent) {
                    clearTimeout(timeout);
                    vow.callback(null, {
                        page: page,
                        agent: agent
                    });
                });

                page.open(lastTopic.url, function (status) {
                    if (status !== "success") {
                        vow.callback(new Error("Failed to load page."));
                    }
                });
            });
        },
        "is ok": function (pageTopic) {
            assert.ok(pageTopic.page);
        },
        "which fires agentConnect with the agent details": function (pageTopic) {
            assert.isString(pageTopic.agent);
        },
        "for a batch": {
            topic: function (pageTopic, browser, lastTopic) {
                var vow = this,
                    results = [],
                    agentCompleteFires = 0,
                    batch = lastTopic.client.createBatch({
                        basedir: __dirname + "/fixture",
                        tests: ["basic.html"]
                    });

                batch.on("agentResult", function (session, agent, details) {
                    results.push(details);
                });

                batch.on("agentScriptError", function (session, agent, details) {
                    vow.callback(new Error("Unexpected script error: " + details.message));
                });

                batch.on("agentComplete", function (session, agent) {
                    agentCompleteFires++;
                });

                batch.on("complete", function () {
                    pageTopic.page.release();
                    vow.callback(null, {
                        agentResults: results,
                        agentCompleteFires: agentCompleteFires
                    });
                });
            },
            "the agentComplete event fired once": function (topic) {
                assert.strictEqual(topic.agentCompleteFires, 1);
            },
            "the agentResults are well-formed": function (topic) {
                assert.isArray(topic.agentResults);
                assert.strictEqual(topic.agentResults.length, 1);

                var result = topic.agentResults[0];

                assert.include(result, "passed");
                assert.include(result, "failed");
                assert.include(result, "total");
                assert.include(result, "ignored");
                assert.include(result, "duration");
                assert.include(result, "name");
                assert.include(result, "timestamp");
            }
        }
    }
    /* TODO agentDisconnect is not yet implemented.
    "visits Yeti briefly for the agentDisconnect event": {
        topic: function (browser, lastTopic) {
            var vow = this;
            browser.createPage(function (page) {
                var timeout = setTimeout(function () {
                    vow.callback(new Error("Timed out."));
                }, 500);

                lastTopic.client.once("agentDisconnect", function (session, agent) {
                    clearTimeout(timeout);
                    vow.callback(null, agent);
                });

                page.open(lastTopic.url, function (status) {
                    if (status !== "success") {
                        vow.callback(new Error("Failed to load page."));
                    }
                    lastTopic.client.once("agentConnect", function (session, agent) {
                        page.release();
                    });
                });
            });
        },
        "which fires with the agent details": function (agent) {
            assert.isString(agent);
        }
    } */
})).export(module);