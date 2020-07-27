interface Votes {
    [party: string]: number
}

interface District {
   voters: Votes
}

interface Electorate {
    districts: District[]
}

interface Rep {
    party: string,
    district: number | "list",
}

type Results = Rep[];

interface VotingMethod {
    execute: (e: Electorate) => Results,
    groupings: (e: Electorate) => number[]
}

const Simulator = (function() {
    function randg(): number {
        var rand = 0;
        for (var i = 0; i < 6; i += 1) {
        rand += Math.random();
        }
        return rand / 6;
    }

    const FPTP: VotingMethod = {
        execute: function (e: Electorate): Results {
            let reps: Results = [];
            for (let i = 0; i < e.districts.length; i++) {
                let winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({party: winner, district: i});
            }
            return reps;
        },
        groupings: function (e: Electorate): number[] {
            return Array(e.districts.length).fill(1);
        } 
    };

    const MMP_BNW: VotingMethod = {
        execute: function(e: Electorate): Results {
            let reps: Results = [];
            let repcount = {};
            for (let i = 0; i < e.districts.length; i++) {
                let winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({party: winner, district: i});
                repcount[winner] = (repcount[winner]|0)+1;
            }

            let votes = Simulator.getTotalVotes(e);

            while (reps.length < e.districts.length * 2) {
                // amount underrepresented
                let diff = {};
                for (let party in votes) {
                    // goal - actual
                    diff[party] = votes[party] - ((repcount[party]|0) / reps.length);
                }
                let max = -Infinity;
                let winnerParty = "";
                for (let party in diff) {
                    if (diff[party] > max) {
                        max = diff[party];
                        winnerParty = party;
                    }
                }

                // find rep
                let alreadyMembers = new Set();
                for (let rep of reps) {
                    if (rep.party == winnerParty) {
                        alreadyMembers.add(rep.district);
                    }
                }

                let districtIndex = -1;
                max = 0;
                for (let i = 0; i < e.districts.length; i++) {
                    let district = e.districts[i];
                    if (district.voters[winnerParty] > max && !alreadyMembers.has(i)) {
                        max = district.voters[winnerParty];
                        districtIndex = i;
                    }
                }

                // TODO: If districtIndex == -1, go to next party
                reps.push({party: winnerParty, district: districtIndex});
                repcount[winnerParty] = (repcount[winnerParty]|0)+1;
            }
            return reps;
        },
        groupings: FPTP.groupings
    };

    const IRV: VotingMethod = {
        execute: function(e: Electorate): Results {
            // assume all voters vote the same way
            // obv oversimplification but
            let choices = {
                labour: ["labour", "green", "liberal"],
                green: ["green", "labour", "liberal"],
                conservative: ["conservative", "liberal", "labour"],
                liberal: ["liberal"]
            };

            let reps: Results = [];
            let irvotes = {};
            for (let i = 0; i < e.districts.length; i++) {
                let votes = e.districts[i].voters;
                Object.assign(irvotes, votes);
                let winner = "";
                console.log(i);
                for (let j = 0; j < 20; j++) {
                    let order = Simulator.getPluralities(irvotes);
                    console.log(order);
                    if (order.length == 1) {
                        winner = order[0];
                        break;
                    }

                    // Eliminate lowest vote %
                    let loser = order[order.length - 1];
                    delete irvotes[loser];
                    order = order.slice(0, -1);

                    // Recalculate irvotes
                    irvotes = {};
                    for (let party in choices) {
                        for (let choice of choices[party]) {
                            if (order.indexOf(choice) != -1) {
                                irvotes[choice] = (irvotes[choice] || 0) + votes[party];
                                break;
                            }
                        }
                    }
                }

                reps.push({party:winner, district: i});
            }
            return reps;
        },
        groupings: FPTP.groupings
    };

    return {
        generate: function(districts: number): Electorate {
            var districtlist: District[] = []
            for (let i = 0; i < districts; i++) {
                var district: District = {
                    voters: {}
                };

                var lib = Math.random() * 0.3 + 0.05;
                var left = (Math.random() * 0.6 + 0.2) * (1-lib);
                var right = 1-lib-left;

                var green = (randg()*0.6) * left;
                var labor = left-green;

                district.voters["labour"] = labor;
                district.voters["conservative"] = right;
                district.voters["liberal"] = lib;
                district.voters["green"] = green;
                districtlist.push(district);
            }

            return {
                districts: districtlist,
            };
        },

        getTotalVotes: function(electorate: Electorate): Votes {
            var m = {};
            for (let district of electorate.districts) {
                for (let party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] / electorate.districts.length;
                    }
                }
            }
            return m;
        },

        getPluralities: function(votes: Votes): string[] {
            var order = [];
            for (let party in votes) {
                order.push(party);
            }
            order.sort(function(a, b): number {
                if (votes[a] < votes[b]) return 1;
                if (votes[a] > votes[b]) return -1;
                return 0;
            })
            return order;
        },

        FPTP: FPTP,
        MMP_BNW: MMP_BNW,
        IRV: IRV,
    }
})();