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

            while (reps.length < e.districts.length * 2 + 1) {
                // amount underrepresented
                let quotients = {};
                for (let party in votes) {
                    // goal - actual
                    quotients[party] = votes[party] / ((repcount[party]|0) + 1);
                }
                let max = -Infinity;
                let winnerParty = "";
                for (let party in quotients) {
                    if (quotients[party] > max && (repcount[party]|0) < e.districts.length) {
                        max = quotients[party] || 0;
                        winnerParty = party;
                    }
                }

                if (winnerParty == "") {
                    for (let party in quotients) {
                        if (quotients[party] > max) {
                            max = quotients[party] || 0;
                            winnerParty = party;
                        }
                    }  
                }

                // find rep
                let alreadyMembers = new Set();
                for (let rep of reps) {
                    if (rep.party == winnerParty) {
                        alreadyMembers.add(rep.district);
                    }
                }

                let districtIndex: number | "list" = "list";
                max = -1;
                for (let i = 0; i < e.districts.length; i++) {
                    let district = e.districts[i];
                    if ((district.voters[winnerParty] || 0) > max && !alreadyMembers.has(i)) {
                        max = district.voters[winnerParty];
                        districtIndex = i;
                    }
                }

                reps.push({party: winnerParty, district: districtIndex,primary:false});
                repcount[winnerParty] = (repcount[winnerParty]|0)+1;
            }
            return reps;
        },
        groupings: FPTP.groupings
    };

    const IRV: VotingMethod = {
        execute: function(e: Electorate): Results {
            let reps: Results = [];
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
            conservative: ["conservative", "liberal", "labour", "green"],
            socialist: ["socialist", "green", "labour"]
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

        outer: for (let j = 0; j < 50; j++) {
            // Winners
            let foundWinner = false;
            // Keep finding winners & rolling over until no more winners.
            for(let k = 0; k < 10; k++) {
                let primaryVotes = irvCalculatePrimary(irvotes);
                let order = Simulator.getPluralities(primaryVotes);
                for (let party of order) {
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

                if (winners.length >= reps) break outer;
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
            let reps: Results = [];
            let startId = 0;
            let groupings = STV.groupings(e);
            for (let size of groupings) {
                let districts = e.districts.slice(startId, startId+size);
                let votes = Simulator.getTotalVotes(districts)
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
            if (e.districts.length > 5) {
                out.push(2);
                out.push(3);
                i += 5;
            }
            for (; i < e.districts.length; i += 5) {
                if (i + 5 >= e.districts.length) {
                    out.push(e.districts.length - i);
                    break;
                } else {
                    out.push(5);
                }
            }
            return out;
        }
    }

    // D'Hondt method
    function prRun(repcount: number, votes: Votes): string[] {
        let reps: string[] = [];
        while (reps.length < repcount) {
            let repprop = {};
            for (let party of reps) {
                repprop[party] = (repprop[party]|0) + 1;
            }

            let quotients = {};
            for (let party in votes) {
                quotients[party] = votes[party] / ((repprop[party]||0) + 1);
            }

            let max = -Infinity;
            let winningParty = "";
            for (let party in quotients) {
                if (quotients[party] > max) {
                    winningParty = party;
                    max = quotients[party];
                }
            }

            reps.push(winningParty);
        }

        return reps;
    }

    const LO_PR: VotingMethod = {
        execute: function(e: Electorate): Results {
            let reps: Results = [];
            let startId = 0;
            let groupings = LO_PR.groupings(e);

            for (let size of groupings) {
                // calculate party-lists
                // assume all voters vote for a candidate from their district
                let votes = Simulator.getTotalVotes(e.districts.slice(startId, startId+size));
                let partyLists = {};
                for (let party in votes) {
                    partyLists[party] = Array(size).fill(0).map((_, i) => i + startId);
                }

                for (let party in partyLists) {
                    partyLists[party].sort(function(da, db) {
                        return e.districts[db].voters[party] - e.districts[da].voters[party]; 
                    });
                }

                let seatList = prRun(size, votes);
                for (let party of seatList) {
                    let district = partyLists[party].shift();
                    reps.push({district: district, party: party, primary: true});
                }

                startId += size;
            }
            return reps;
        },
        groupings: function(e: Electorate): number[] {
            let out = [];
            let i = 0;
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
                } else {
                    out.push(5);
                }
            }
            return out;
        }
    }

    return {
        generate: function(reps: number, probabilities: {[party: string]: number}): Electorate {
            let ranges = {};
            let current = 0;
            for (let party in probabilities) {
                ranges[party] = [current, current+probabilities[party]];
                current += probabilities[party];
            }

            var districtlist: District[] = [];
            for (let i = 0; i < reps; i++) {

                var district: District = {
                    voters: {}
                };

                let voters = {};
                voterloop: for (let i = 0; i < 17; i++) {
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
                    district.voters[party] = voters[party] / 17;                    
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
        LO_PR: LO_PR
    }
})();