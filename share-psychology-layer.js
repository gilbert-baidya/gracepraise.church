/**
 * Share Psychology Layer
 * Generates emotional hooks to encourage sharing
 */

(function (window) {
    'use strict';

    const MICRO_COPY = {
        COMFORT: [
            "Someone you love may need this today.",
            "Send peace to a weary heart.",
            "Share God's comfort with a friend."
        ],
        HOPE: [
            "Share hope with one friend today.",
            "Encourage someone who is waiting.",
            "Pass this promise on."
        ],
        VICTORY: [
            "Share this victory with a friend!",
            "Declare God's power today.",
            "Encourage someone to keep fighting."
        ],
        WARNING: [
            "This truth is too important to keep.",
            "Share wisdom with someone you love.",
            "Help someone turn back to light."
        ],
        CELEBRATION: [
            "Celebrate God’s goodness with someone!",
            "Share the joy of the Lord!",
            "Let’s praise Him together."
        ],
        HEALING: [
            "Send healing words to a friend.",
            "Share this prayer for restoration.",
            "Encourage someone who is hurting."
        ],
        REPENTANCE: [
            "Share the freedom of forgiveness.",
            "Remind someone of God's mercy.",
            "Grace is for sharing."
        ],
        GUIDANCE: [
            "Help someone find their way today.",
            "Share God's light for the path.",
            "Point someone to the Truth."
        ]
    };

    function randomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    const SharePsychologyLayer = {
        getMicroCopy: function (emotionType) {
            const list = MICRO_COPY[emotionType] || MICRO_COPY.HOPE;
            return randomItem(list);
        }
    };

    window.SharePsychologyLayer = SharePsychologyLayer;

})(window);
