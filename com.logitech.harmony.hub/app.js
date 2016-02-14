"use strict";
var harmony = require("harmonyhubjs-client");

var self = module.exports = {
    init: function() {
        var ipaddress = Homey.manager("settings").get("ipaddress");
        if (ipaddress) {
            // Listen for flow triggers.
            self.listenForTriggers(ipaddress);
        }
    },
    /**
     * Start listening again using updated IP address.
     * 
     * @param {} settings 
     * @param {} callback 
     * @returns {} 
     */
    updateSettings: function (settings, callback) {
        // Listen for flow triggers
        self.listenForTriggers(settings.ipaddress);
    },
    /**
     * Starts listening for specific triggers and sends them to the Harmony Hub at the given IP address.
     * 
     * @param {} ipaddress 
     * @returns {} 
     */
    listenForTriggers: function(ipaddress) {
        // On triggered flow
        Homey.manager("flow").on("action.start_activity", function(callback, args) {
            harmony(ipaddress)
                .then(function(harmonyClient) {
                    harmonyClient.isOff()
                        .then(function(off) {
                            if (off) {
                                var result1 = self.startActivity(harmonyClient, args.activity);
                                callback(null, result1);
                            } else {
                                harmonyClient.getCurrentActivity()
                                    .then(function(currentActivity) {
                                        var result2;
                                        if (currentActivity !== args.activity) {
                                            result2 = self.startActivity(harmonyClient, args.activity);
                                        } else {
                                            Homey.manager('speech-output').say(__("speech.activity_already_active"));
                                            result2 = true;
                                        }
                                        callback(null, result2);
                                    });
                            }
                        });
                });
            callback(null, true); // we've fired successfully
        });

        Homey.manager("flow").on("action.all_off", function(callback, args) {
            harmony(ipaddress)
                .then(function(harmonyClient) {
                    harmonyClient.isOff()
                        .then(function(off) {
                            if (!off) {
                                var result = self.turnOff(harmonyClient);
                                callback(null, result); // we've fired successfully
                            } else {
                                Homey.manager('speech-output').say(__("speech.already_off"));
                            }
                        });
                });
        });
    },
    /**
     * Starts the specified activity through the given harmony client.
     * 
     * @param {} harmonyClient 
     * @param {} activityName 
     * @returns {} true/false
     */
    startActivity: function(harmonyClient, activityName) {
        console.log("Currently off. Starting activity '" + activityName + "'...");
        Homey.manager('speech-output').say(__("speech.starting_activity").replace("{0}", activityName));
        harmonyClient.getActivities()
            .then(function(activities) {
                activities.some(function(activity) {
                    if (activity.label === activityName) {
                        var id = activity.id;
                        harmonyClient.startActivity(id);
                        harmonyClient.end();
                        return true;
                    }
                    // We were not able to find an activity by the given name.
                    return false;
                });
            });
    },
    /**
     * Turns off all devices through the given harmony client.
     * 
     * @param {} harmonyClient 
     * @returns {} true/false
     */
    turnOff: function(harmonyClient) {
        console.log("Currently on. Turning all devices off...");
        Homey.manager('speech-output').say(__("speech.turning_all_off"));
        harmonyClient.turnOff();
        harmonyClient.end();
        return true;
    }
};