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
    primary: boolean
}

type Results = Rep[];

interface VotingMethod {
    execute: (e: Electorate) => Results,
    groupings: (e: Electorate) => number[]
}

const Simulator = (function() {
    function randg(it: number): number {
        var rand = 0;
        for (var i = 0; i < it; i += 1) {
        rand += Math.random();
        }
        return rand / it;
    }

    const FPTP: VotingMethod = {
        execute: function (e: Electorate): Results {
            let reps: Results = [];
            for (let i = 0; i < e.districts.length; i++) {
                let winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({party: winner, district: i, primary:true});
            }
            return reps;
        },
        groupings: function (e: Electorate): number[] {
            return Array(e.districts.length).fill(1);
        } 
    };

    const NW_MMP: VotingMethod = {
        execute: function(e: Electorate): Results {
            let reps: Results = [];
            let repcount = {};
            for (let i = 0; i < e.districts.length; i++) {
                let winner = Simulator.getPluralities(e.districts[i].voters)[0];
                reps.push({party: winner, district: i, primary:true});
                repcount[winner] = (repcount[winner]|0)+1;
            }

            let votes = Simulator.getTotalVotes(e.districts);

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
                reps.push({party: winnerParty, district: districtIndex,primary:false});
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
                let winner = irvRun(1, e.districts[i].voters)[0];
                reps.push({party:winner, district: i, primary:true});
            }
            return reps;
        },
        groupings: FPTP.groupings
    };

    function irvCalculatePrimary(irvotes: {[ranking: string]: number}): Votes {
        let votes: Votes = {};
        for (let ranking in irvotes) {
            let primary = ranking.split(",")[0];
            votes[primary] = (votes[primary] || 0) + irvotes[ranking];
        }
        return votes;
    }

    function irvRun(reps: number, votes: Votes): string[] {
        let threshold = 1 / (reps + 1);
        const choices = {
            labour: ["labour", "green", "liberal"],
            green: ["green", "labour", "liberal"],
            conservative: ["conservative", "liberal", "green"]
        };

        let irvotes = {};
        for (let party in votes) {
            let rank = "";
            if (party in choices) {
                rank = choices[party].map(c => (c+",").repeat(reps)).join("");
            } else {
                rank = (party+",").repeat(reps);
            }
            irvotes[rank] = votes[party];
        }

        let winners = [];

        for (let j = 0; j < 50; j++) {
            // Winners
            let foundWinner = false;
            // Keep finding winners & rolling over until no more winners.
            for(let k = 0; k < 10; k++) {
                let primaryVotes = irvCalculatePrimary(irvotes);
                for (let party in primaryVotes) {
                    // If they crossed the winning threshold,
                    // add them to the winner list & rollover votes.
                    if (primaryVotes[party] > threshold) {
                        winners.push(party);
                        foundWinner = true;

                        // Rollover votes
                        let fraction = (primaryVotes[party] - threshold) / primaryVotes[party];
                        for (let ranking in irvotes) {
                            // If ranking has one as primary vote
                            // rollover fraction to next vote.
                            if (ranking.split(",")[0] == party) {
                                let newR = ranking.split(",").slice(1).join(",");
                                irvotes[newR] = (irvotes[newR] || 0) + irvotes[ranking] * fraction;
                                delete irvotes[ranking];
                            }
                        }

                        break;
                    }
                }

                if (!foundWinner) break;
            }

            if (winners.length >= reps) break;

            let primaryVotes = irvCalculatePrimary(irvotes);
            let order = Simulator.getPluralities(primaryVotes);

            if (order.length + winners.length <= reps) {
                winners.push(...order);
                break;
            }

            // Eliminate lowest-ranked party
            let loser = order[order.length - 1];
            // Transfer votes to next choice
            for (let ranking in irvotes) {
                if (ranking.split(",")[0] == loser) {
                    let newR = ranking.split(",").slice(1).join(",");
                    irvotes[newR] = (irvotes[newR] || 0) + irvotes[ranking];
                    delete irvotes[ranking];
                }
            }
        }

        return winners;
    }

    const STV: VotingMethod = {
        execute: function(e: Electorate): Results {
            let choices = {
                labour: ["labour", "green", "liberal"],
                green: ["green", "labour", "liberal"],
                conservative: ["conservative", "liberal", "labour"],
                liberal: ["liberal"]
            };

            let reps: Results = [];
            let startId = 0;
            let groupings = STV.groupings(e);
            for (let size of groupings) {
                let districts = e.districts.slice(startId, startId+size);
                let votes = Simulator.getTotalVotes(districts)
                console.log(startId);
                let winners = irvRun(size, votes);
                

                let count = {};
                for (let winner of winners) {
                    reps.push({party: winner, district: startId+(count[winner]||0), primary: true});

                    count[winner] = (count[winner] || 0) + 1;
                }

                startId += size;
            }
            return reps;
        },
        groupings: function(e: Electorate): number[] {
            let out = [];
            let i = 0;
            if (e.districts.length > 6) {
                out.push(6);
                i += 6;
            }
            for (; i < e.districts.length; i += 3) {
                if (i + 3 >= e.districts.length) {
                    out.push(e.districts.length - i);
                    break;
                } else {
                    out.push(3);
                }
            }
            return out;
        }
    }

    return {
        generate: function(probabilities: {[party: string]: number}): Electorate {
            let ranges = {};
            let current = 0;
            for (let party in probabilities) {
                ranges[party] = [current, current+probabilities[party]];
                current += probabilities[party];
            }

            var districtlist: District[] = [];
            for (let i = 0; i < 36; i++) {

                var district: District = {
                    voters: {}
                };

                let voters = {};
                voterloop: for (let i = 0; i < 25; i++) {
                    let n = Math.random();
                    for (let party in ranges) {
                        if (ranges[party][0] <= n && n < ranges[party][1]) {
                            voters[party] = (voters[party] | 0) + 1;
                            continue voterloop;
                        }
                    }

                    i--;
                }

                for (let party in voters) {
                    district.voters[party] = voters[party] / 25;                    
                }
                districtlist.push(district);
            }

            return {
                districts: districtlist,
            };
        },

        getTotalVotes: function(d: District[]): Votes {
            var m = {};
            for (let district of d) {
                for (let party in district.voters) {
                    if (typeof district.voters[party] == "number") {
                        m[party] = (m[party] || 0) + district.voters[party] / d.length;
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
        NW_MMP: NW_MMP,
        IRV: IRV,
        STV: STV,
    }
})();