var moment = require('moment');
var _ = require('underscore');
var notSumKeys = 'id messageId threadId toUserId fromUserId userId'.split(' ');

/**
 * 
 * Generates a structure from the database:
 * 
 * userMap: {
 *      userId: {
 *          monthData:
 *              {
 *              YYYYMM: {
 *                  inbound: { .. count, length, avgerageLength, emotions ..},
 *                  outbound: { .. },
 *                  sum: { .. }
 *              },
 *              ...
 *        }
 *      }
 *      ...
 * }
 * 
 * round1 doNotOverComplicate it statement:
 *  first only month!!! When I see it's working, i can go for changeable
 * 
 */

exports.userActivityByMonth = function(messageData) {

    /* First group by user */
    var messages = _.chain(messageData.messages).groupBy(function(message) {
            return message.userId;
        }).map(function(userMessages, userId) {

            var firstMessageDate = userMessages.reduce(function(minDate, currentMessage) {
                return moment(currentMessage.sendDate).isBefore(minDate) ?
                    currentMessage.sendDate : minDate;
            }, userMessages[0].sendDate);
            var lastMessageDate = userMessages.reduce(function(maxDate, currentMessage) {
                return moment(currentMessage.sendDate).isAfter(maxDate) ?
                    currentMessage.sendDate : maxDate;
            }, userMessages[0].sendDate);
            /* userId: {metadata, monthData} */
            return [userId, {
                userName: messageData.parsingMetaData.userIdMap[userMessages[0].userId],
                firstMessageDate: firstMessageDate,
                firstMonthKey: dateToTimeKey(firstMessageDate),
                lastMessageDate: lastMessageDate,
                lastMonthKey: dateToTimeKey(lastMessageDate),
                
                /* Second, group by time, now simply by YYYYMM */
                monthData: _.chain(userMessages).groupBy(function(messageByUser) {
                        return dateToTimeKey(messageByUser.sendDate);
                    })
                    .map(function(monthData, monthKey) {
                        /* monthData: {monthKey:{ sumdata} } */
                        return [monthKey, createMessageStatsFromMessageArray(monthData)];
                    }).object().value()
            }];
        })
        .object().value();

    return messages;
};

/**
 * @returns a summarized object of stats of the messages provided.
 * Structure: {
 *      inbound: {
 *                  length: sum(inboundLength),
 *                  count: number of inbound messages,
 *                  emotionSums ...
 *              }
 *      outbound: { ... same as inbound }
 *      sum: {  ... all of the above summed }
 * }  
 */

function createMessageStatsFromMessageArray(messages) {
    var initial = {
        inbound: {
            count: 0,
        },
        outbound: {},
        sum: {}
    };
    var ret = messages.reduce(function(prev, message) {

        if (message.isInbound) prev.inbound.count += 1;

        for (var key in message) {
            var fieldValue = message[key];
            /* Sum only number types except the ones listed above */
            if (typeof(fieldValue) == 'number' && (notSumKeys.indexOf(key) == -1)) {
                var inOrOutBoundKey = message.isInbound ? 'inbound' : 'outbound';

                /* Increase in or outbound value of the key */
                if (!prev[inOrOutBoundKey][key]) prev[inOrOutBoundKey][key] = 0;
                prev[inOrOutBoundKey][key] += message[key];

                if (!prev.sum[key]) prev.sum[key] = 0;
                prev.sum[key] += message[key];
            }
        }
        return prev;

    }, initial);

    ret.outbound.count = messages.length - ret.inbound.count;
    ret.inbound.averageLength = ret.inbound.count ? ret.inbound.length / ret.inbound.count : 0;
    ret.outbound.averageLength = ret.outbound.count ? ret.outbound.length / ret.outbound.count : 0;
    return ret;
}

/** 
 * Creates a grouping key from a given date. 
 */
function dateToTimeKey(date) {
    return moment(date).format('YYYYMM');
}