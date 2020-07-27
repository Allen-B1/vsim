interface Votes {
    [party: string]: number
}

interface District {
    reps: number,
    voters: Votes
}
interface Electorate {
    districts: District[]
    totalreps: number,
}

interface Rep {
    party: string,
    district: number,
}

type Results = Rep[];

interface VotingMethod {
    execute: (e: Electorate) => Results,
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
                let winners = Simulator.getPluralities(e.districts[i].voters).slice(0, e.districts[i].reps);
                for (let winner of winners) {
                    reps.push({party: winner, district: i});
                }
            }
            return reps;
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

            while (reps.length < e.totalreps * 2) {
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
        }
    };

    return {
        generate: function(districts: number[]): Electorate {
            var totalreps = 0;
            for (let repcount of districts) {
                totalreps += repcount;
            }

            var districtlist: District[] = []
            for (let repcount of districts) {
                var district: District = {
                    reps: repcount,
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
                totalreps: totalreps,
            };
        },

        getTotalVotes: function(electorate: Electorate): Votes {
            var m = {};
            for (let district of electorate.districts) {
                for (let party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] * (district.reps / electorate.totalreps);
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
    }
})();