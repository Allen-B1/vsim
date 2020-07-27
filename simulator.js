var Simulator = (function () {
    function randg() {
        var rand = 0;
        for (var i = 0; i < 6; i += 1) {
            rand += Math.random();
        }
        return rand / 6;
    }
    var FPTP = {
        execute: function (e) {
            var reps = [];
            for (var i = 0; i < e.districts.length; i++) {
                var winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({ party: winner, district: i });
            }
            return reps;
        },
        groupings: function (e) {
            return Array(e.districts.length).fill(1);
        }
    };
    var MMP_BNW = {
        execute: function (e) {
            var reps = [];
            var repcount = {};
            for (var i = 0; i < e.districts.length; i++) {
                var winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({ party: winner, district: i });
                repcount[winner] = (repcount[winner] | 0) + 1;
            }
            var votes = Simulator.getTotalVotes(e);
            while (reps.length < e.districts.length * 2) {
                // amount underrepresented
                var diff = {};
                for (var party in votes) {
                    // goal - actual
                    diff[party] = votes[party] - ((repcount[party] | 0) / reps.length);
                }
                var max = -Infinity;
                var winnerParty = "";
                for (var party in diff) {
                    if (diff[party] > max) {
                        max = diff[party];
                        winnerParty = party;
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
                var districtIndex = -1;
                max = 0;
                for (var i = 0; i < e.districts.length; i++) {
                    var district = e.districts[i];
                    if (district.voters[winnerParty] > max && !alreadyMembers.has(i)) {
                        max = district.voters[winnerParty];
                        districtIndex = i;
                    }
                }
                // TODO: If districtIndex == -1, go to next party
                reps.push({ party: winnerParty, district: districtIndex });
                repcount[winnerParty] = (repcount[winnerParty] | 0) + 1;
            }
            return reps;
        },
        groupings: FPTP.groupings
    };
    var IRV = {
        execute: function (e) {
            // assume all voters vote the same way
            // obv oversimplification but
            var choices = {
                labour: "liberal",
                green: "labour",
                conservative: "liberal",
                liberal: undefined
            };
            var reps = [];
            var irvotes = {};
            for (var i = 0; i < e.districts.length; i++) {
                var votes = e.districts[i].voters;
                Object.assign(irvotes, votes);
                var winner = "";
                for (var j = 0; j < 20; j++) {
                    var order = Simulator.getPluralities(irvotes);
                    if (order.length == 1) {
                        winner = order[0];
                        break;
                    }
                    var loser = order[order.length - 1];
                    var nextChoice = choices[loser];
                    if (nextChoice) {
                        irvotes[nextChoice] += irvotes[loser];
                    }
                    delete irvotes[loser];
                }
                reps.push({ party: winner, district: i });
            }
            return reps;
        },
        groupings: FPTP.groupings
    };
    return {
        generate: function (districts) {
            var districtlist = [];
            for (var i = 0; i < districts; i++) {
                var district = {
                    voters: {}
                };
                var lib = Math.random() * 0.3 + 0.05;
                var left = (Math.random() * 0.6 + 0.2) * (1 - lib);
                var right = 1 - lib - left;
                var green = (randg() * 0.6) * left;
                var labor = left - green;
                district.voters["labour"] = labor;
                district.voters["conservative"] = right;
                district.voters["liberal"] = lib;
                district.voters["green"] = green;
                districtlist.push(district);
            }
            return {
                districts: districtlist
            };
        },
        getTotalVotes: function (electorate) {
            var m = {};
            for (var _i = 0, _a = electorate.districts; _i < _a.length; _i++) {
                var district = _a[_i];
                for (var party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] / electorate.districts.length;
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
        MMP_BNW: MMP_BNW,
        IRV: IRV
    };
})();
