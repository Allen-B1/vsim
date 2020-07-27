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
                var winners = Simulator.getPluralities(e.districts[i].voters).slice(0, e.districts[i].reps);
                for (var _i = 0, winners_1 = winners; _i < winners_1.length; _i++) {
                    var winner = winners_1[_i];
                    reps.push({ party: winner, district: i });
                }
            }
            return reps;
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
            while (reps.length < e.totalreps * 2) {
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
        }
    };
    return {
        generate: function (districts) {
            var totalreps = 0;
            for (var _i = 0, districts_1 = districts; _i < districts_1.length; _i++) {
                var repcount = districts_1[_i];
                totalreps += repcount;
            }
            var districtlist = [];
            for (var _a = 0, districts_2 = districts; _a < districts_2.length; _a++) {
                var repcount = districts_2[_a];
                var district = {
                    reps: repcount,
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
                districts: districtlist,
                totalreps: totalreps
            };
        },
        getTotalVotes: function (electorate) {
            var m = {};
            for (var _i = 0, _a = electorate.districts; _i < _a.length; _i++) {
                var district = _a[_i];
                for (var party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] * (district.reps / electorate.totalreps);
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
        MMP_BNW: MMP_BNW
    };
})();
