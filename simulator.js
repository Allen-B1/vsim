var Simulator = (function () {
    function randg(it) {
        var rand = 0;
        for (var i = 0; i < it; i += 1) {
            rand += Math.random();
        }
        return rand / it;
    }
    var FPTP = {
        execute: function (e) {
            var reps = [];
            for (var i = 0; i < e.districts.length; i++) {
                var winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({ party: winner, district: i, primary: true });
            }
            return reps;
        },
        groupings: function (e) {
            return Array(e.districts.length).fill(1);
        }
    };
    var NW_MMP = {
        execute: function (e) {
            var reps = [];
            var repcount = {};
            for (var i = 0; i < e.districts.length; i++) {
                var winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({ party: winner, district: i, primary: true });
                repcount[winner] = (repcount[winner] | 0) + 1;
            }
            var votes = Simulator.getTotalVotes(e.districts);
            while (reps.length < e.districts.length * 2 + 1) {
                // amount underrepresented
                var quotients = {};
                for (var party in votes) {
                    // goal - actual
                    quotients[party] = votes[party] / ((repcount[party] | 0) + 1);
                }
                var max = -Infinity;
                var winnerParty = "";
                for (var party in quotients) {
                    if (quotients[party] > max && (repcount[party] | 0) < e.districts.length) {
                        max = quotients[party] || 0;
                        winnerParty = party;
                    }
                }
                if (winnerParty == "") {
                    for (var party in quotients) {
                        if (quotients[party] > max) {
                            max = quotients[party] || 0;
                            winnerParty = party;
                        }
                    }
                }
                // find rep
                var alreadyMembers = new Set();
                for (var _i = 0, reps_1 = reps; _i < reps_1.length; _i++) {
                    var rep = reps_1[_i];
                    if (rep.party == winnerParty) {
                        alreadyMembers.add(rep.district);
                    }
                }
                var districtIndex = "list";
                max = -1;
                for (var i = 0; i < e.districts.length; i++) {
                    var district = e.districts[i];
                    if ((district.voters[winnerParty] || 0) > max && !alreadyMembers.has(i)) {
                        max = district.voters[winnerParty];
                        districtIndex = i;
                    }
                }
                reps.push({ party: winnerParty, district: districtIndex, primary: false });
                repcount[winnerParty] = (repcount[winnerParty] | 0) + 1;
            }
            return reps;
        },
        groupings: FPTP.groupings
    };
    var IRV = {
        execute: function (e) {
            var reps = [];
            for (var i = 0; i < e.districts.length; i++) {
                var winner = irvRun(1, e.districts[i].voters)[0];
                reps.push({ party: winner, district: i, primary: true });
            }
            return reps;
        },
        groupings: FPTP.groupings
    };
    function irvCalculatePrimary(irvotes) {
        var votes = {};
        for (var ranking in irvotes) {
            var primary = ranking.split(",")[0];
            votes[primary] = (votes[primary] || 0) + irvotes[ranking];
        }
        return votes;
    }
    function irvRun(reps, votes) {
        var threshold = 1 / (reps + 1);
        var choices = {
            labour: ["labour", "green", "liberal"],
            green: ["green", "labour", "liberal"],
            conservative: ["conservative", "liberal", "labour", "green"],
            socialist: ["socialist", "green", "labour"]
        };
        var irvotes = {};
        for (var party in votes) {
            var rank = "";
            if (party in choices) {
                rank = choices[party].map(function (c) { return (c + ",").repeat(reps); }).join("");
            }
            else {
                rank = (party + ",").repeat(reps);
            }
            irvotes[rank] = votes[party];
        }
        var winners = [];
        outer: for (var j = 0; j < 50; j++) {
            // Winners
            var foundWinner = false;
            // Keep finding winners & rolling over until no more winners.
            for (var k = 0; k < 10; k++) {
                var primaryVotes_1 = irvCalculatePrimary(irvotes);
                var order_1 = Simulator.getPluralities(primaryVotes_1);
                for (var _i = 0, order_2 = order_1; _i < order_2.length; _i++) {
                    var party = order_2[_i];
                    // If they crossed the winning threshold,
                    // add them to the winner list & rollover votes.
                    if (primaryVotes_1[party] > threshold) {
                        winners.push(party);
                        foundWinner = true;
                        // Rollover votes
                        var fraction = (primaryVotes_1[party] - threshold) / primaryVotes_1[party];
                        for (var ranking in irvotes) {
                            // If ranking has one as primary vote
                            // rollover fraction to next vote.
                            if (ranking.split(",")[0] == party) {
                                var newR = ranking.split(",").slice(1).join(",");
                                irvotes[newR] = (irvotes[newR] || 0) + irvotes[ranking] * fraction;
                                delete irvotes[ranking];
                            }
                        }
                        break;
                    }
                }
                if (winners.length >= reps)
                    break outer;
                if (!foundWinner)
                    break;
            }
            if (winners.length >= reps)
                break;
            var primaryVotes = irvCalculatePrimary(irvotes);
            var order = Simulator.getPluralities(primaryVotes);
            if (order.length + winners.length <= reps) {
                winners.push.apply(winners, order);
                break;
            }
            // Eliminate lowest-ranked party
            var loser = order[order.length - 1];
            // Transfer votes to next choice
            for (var ranking in irvotes) {
                if (ranking.split(",")[0] == loser) {
                    var newR = ranking.split(",").slice(1).join(",");
                    irvotes[newR] = (irvotes[newR] || 0) + irvotes[ranking];
                    delete irvotes[ranking];
                }
            }
        }
        return winners;
    }
    var STV = {
        execute: function (e) {
            var reps = [];
            var startId = 0;
            var groupings = STV.groupings(e);
            for (var _i = 0, groupings_1 = groupings; _i < groupings_1.length; _i++) {
                var size = groupings_1[_i];
                var districts = e.districts.slice(startId, startId + size);
                var votes = Simulator.getTotalVotes(districts);
                var winners = irvRun(size, votes);
                var count = {};
                for (var _a = 0, winners_1 = winners; _a < winners_1.length; _a++) {
                    var winner = winners_1[_a];
                    reps.push({ party: winner, district: startId + (count[winner] || 0), primary: true });
                    count[winner] = (count[winner] || 0) + 1;
                }
                startId += size;
            }
            return reps;
        },
        groupings: function (e) {
            var out = [];
            var i = 0;
            if (e.districts.length > 5) {
                out.push(2);
                out.push(3);
                i += 5;
            }
            for (; i < e.districts.length; i += 5) {
                if (i + 5 >= e.districts.length) {
                    out.push(e.districts.length - i);
                    break;
                }
                else {
                    out.push(5);
                }
            }
            return out;
        }
    };
    // D'Hondt method
    function prRun(repcount, votes) {
        var reps = [];
        while (reps.length < repcount) {
            var repprop = {};
            for (var _i = 0, reps_2 = reps; _i < reps_2.length; _i++) {
                var party = reps_2[_i];
                repprop[party] = (repprop[party] | 0) + 1;
            }
            var quotients = {};
            for (var party in votes) {
                quotients[party] = votes[party] / ((repprop[party] || 0) + 1);
            }
            var max = -Infinity;
            var winningParty = "";
            for (var party in quotients) {
                if (quotients[party] > max) {
                    winningParty = party;
                    max = quotients[party];
                }
            }
            reps.push(winningParty);
        }
        return reps;
    }
    var LO_PR = {
        execute: function (e) {
            var reps = [];
            var startId = 0;
            var groupings = LO_PR.groupings(e);
            for (var _i = 0, groupings_2 = groupings; _i < groupings_2.length; _i++) {
                var size = groupings_2[_i];
                // calculate party-lists
                // assume all voters vote for a candidate from their district
                var votes = Simulator.getTotalVotes(e.districts.slice(startId, startId + size));
                var partyLists = {};
                for (var party in votes) {
                    partyLists[party] = Array(size).fill(0).map(function (_, i) { return i + startId; });
                }
                var _loop_1 = function (party) {
                    partyLists[party].sort(function (da, db) {
                        return e.districts[db].voters[party] - e.districts[da].voters[party];
                    });
                };
                for (var party in partyLists) {
                    _loop_1(party);
                }
                var seatList = prRun(size, votes);
                for (var _a = 0, seatList_1 = seatList; _a < seatList_1.length; _a++) {
                    var party = seatList_1[_a];
                    var district = partyLists[party].shift();
                    reps.push({ district: district, party: party, primary: true });
                }
                startId += size;
            }
            return reps;
        },
        groupings: function (e) {
            var out = [];
            var i = 0;
            if (e.districts.length > 20) {
                out.push(5);
                out.push(5);
                out.push(10);
                i += 20;
            }
            for (; i < e.districts.length; i += 5) {
                if (i + 5 >= e.districts.length) {
                    out.push(e.districts.length - i);
                    break;
                }
                else {
                    out.push(5);
                }
            }
            return out;
        }
    };
    return {
        generate: function (reps, probabilities) {
            var ranges = {};
            var current = 0;
            for (var party in probabilities) {
                ranges[party] = [current, current + probabilities[party]];
                current += probabilities[party];
            }
            var districtlist = [];
            for (var i = 0; i < reps; i++) {
                var district = {
                    voters: {}
                };
                var voters = {};
                voterloop: for (var i_1 = 0; i_1 < 11; i_1++) {
                    var n = Math.random();
                    for (var party in ranges) {
                        if (ranges[party][0] <= n && n < ranges[party][1]) {
                            voters[party] = (voters[party] | 0) + 1;
                            continue voterloop;
                        }
                    }
                    i_1--;
                }
                voterloop2: for (var i_2 = 0; i_2 < 11; i_2++) {
                    var n = Math.random();
                    for (var party in ranges) {
                        if (ranges[party][0] <= n && n < ranges[party][1]) {
                            voters[party] = (voters[party] | 0) + Math.random() * 0.2 + 0.2;
                            continue voterloop2;
                        }
                    }
                    i_2--;
                }
                var totalvotes = 0;
                for (var party in voters) {
                    totalvotes += voters[party];
                }
                for (var party in voters) {
                    district.voters[party] = voters[party] / totalvotes;
                }
                districtlist.push(district);
            }
            return {
                districts: districtlist
            };
        },
        getTotalVotes: function (d) {
            var m = {};
            for (var _i = 0, d_1 = d; _i < d_1.length; _i++) {
                var district = d_1[_i];
                for (var party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] / d.length;
                    }
                }
            }
            return m;
        },
        getPluralities: function (votes) {
            var order = [];
            for (var party in votes) {
                order.push(party);
            }
            order.sort(function (a, b) {
                if (votes[a] < votes[b])
                    return 1;
                if (votes[a] > votes[b])
                    return -1;
                return 0;
            });
            return order;
        },
        FPTP: FPTP,
        NW_MMP: NW_MMP,
        IRV: IRV,
        STV: STV,
        LO_PR: LO_PR
    };
})();
