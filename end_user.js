function executeQuery(collection, query) {
    try {
        let times = [];
        for (let i = 0; i < 10; i++) {
            var start = new Date().getTime();
            // query     use .explain("executionStats") to not count time to retrieve the data
            collection.explain("executionStats").aggregate(query);
            var diff = new Date().getTime() - start;
            times.push(diff);
        }

        times.sort((a, b)=>(a - b)); // sort the array
        times.pop(); // remove max
        times.shift(); //remove min

        var sum = 0;
        times.forEach(num => { sum+=num});

        print("avg execution time : " + sum/10 + "ms");
    } catch(error) {
        print(error)
    }
}

print("End-User Queries");
print("1)Simple: What are the games in the 'Action' genre with user reviews?");
print("fusion");
executeQuery(db.games_with_reviews, [{ $match: { genres: { $regex: "Action", $options: "i" }, "reviews.0": { $exists: true } } },{ $project: { game_name: 1, genres: 1, reviews: 1 } }]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $lookup: { from: "games_description", localField: "game_name", foreignField: "name", as: "description" } }, { $unwind: { path: "$description", preserveNullAndEmptyArrays: true } }, { $match: { "description.genres": { $regex: "Action", $options: "i" }, "review": { $exists: true }}}, { $project: { _id: 0, game_name: "$game_name", rank: "$rank", genres: "$description.genres", review: "$review", score: "$score" } }]);

print("2)Simple:What games developed by 'Ubisoft' have the most recommendations?");
print("fusion");
executeQuery(db.games_with_reviews, [ { $match: { publisher: { $regex: "Ubisoft", $options: "i" } } }, { $unwind: "$reviews" }, { $group: { _id: "$name", total_recommendations: { $sum: 1 } } }, { $sort: { total_recommendations: -1 } }, { $limit: 10 }, { $project: { _id: 0, game_name: "$_id", total_recommendations: 1 } } ]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $lookup: { from: "games_description", localField: "game_name", foreignField: "name", as: "game_info" } }, { $unwind: "$game_info" }, { $match: { "game_info.publisher": { $regex: "Ubisoft", $options: "i" } } }, { $group: { _id: "$game_name", total_recommendations: { $sum: 1 } } }, { $sort: { total_recommendations: -1 } }, { $limit: 10 }, { $project: { _id: 0, game_name: "$_id", total_recommendations: 1 } } ]);

print("3)What are the most recent video games with reviews, grouped by their release dates, including their total review counts and recommendations?");
print("fusion");
executeQuery(db.games_with_reviews, [ { $match: { "reviews.review": { $exists: true, $ne: null } } }, { $group: { _id: "$name", total_reviews: { $sum: { $size: "$reviews" } }, recommendation: { $first: "$reviews.recommendation" } } }, { $lookup: { from: "merged_data", localField: "_id", foreignField: "Title", as: "commercial_info" } }, { $unwind: "$commercial_info" }, { $group: { _id: "$commercial_info.Release Date", games: { $push: { name: "$_id", total_reviews: "$total_reviews", recommendation: "$recommendation" } }, total_reviews: { $sum: "$total_reviews" } } }, { $project: { _id: 0, release_date: "$_id", games: 1, total_reviews: 1 } }, { $sort: { release_date: -1 } }, { $limit: 10 } ]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $match: { review: { $exists: true, $ne: "" } } }, { $group: { _id: "$game_name", total_reviews: { $sum: 1 }, recommendation: { $first: { $cond: { if: { $ne: ["$review", ""] }, then: "$review", else: "No Review" } } } } }, { $lookup: { from: "games_ranking_commercial_data", localField: "_id", foreignField: "game_name", as: "commercial_info" } }, { $unwind: "$commercial_info" }, { $group: { _id: "$commercial_info.release_date", games: { $push: { name: "$_id", total_reviews: "$total_reviews", recommendation: { $ifNull: ["$recommendation", "No Review"] }, rank: "$commercial_info.rank" } }, total_reviews: { $sum: "$total_reviews" } } }, { $project: { _id: 0, release_date: "$_id", games: 1, total_reviews: 1 } }, { $sort: { release_date: -1 } }, { $limit: 10 } ]);

print("4) Medium:What are the top 10 games with the best player rating and most hours played?");
print("fusion");
executeQuery(db.games_with_reviews, [ { $lookup: { from: "games_with_rankings", localField: "name", foreignField: "name", as: "rankings_info" } }, { $unwind: "$rankings_info" }, { $unwind: "$reviews" }, { $group: { _id: "$name", total_hours: { $sum: { $cond: { if: { $gte: [{ $type: "$reviews.hours_played" }, "double"] }, then: "$reviews.hours_played", else: { $toDouble: { $replaceAll: { input: "$reviews.hours_played", find: ",", replacement: "" } } } } } }, best_rank: { $min: "$rankings_info.rankings.rank" } } }, { $sort: { best_rank: 1, total_hours: -1 } }, { $limit: 10 }, { $project: { _id: 0, game_name: "$_id", total_hours: 1, best_rank: 1 } } ]);
print("overload");
print("ya pas de query pour l'overload");

print("5)Complex: Which games have a rating “Overwhelmingly Positive” and are available for less than $10 ?")
print("fusion");
executeQuery(db.games_with_reviews, [ { $lookup: { from: "merged_data", localField: "name", foreignField: "Title", as: "commercial_info" } }, { $unwind: "$commercial_info" }, { $match: { "overall_player_rating": "Overwhelmingly Positive" } }, { $addFields: { clean_discounted_price: { $cond: { if: { $eq: ["$commercial_info.Discounted Price", "Free"] }, then: 0, else: { $toDouble: { $trim: { input: { $replaceAll: { input: "$commercial_info.Discounted Price", find: ",", replacement: "" } }, chars: " $" } } } } } } }, { $match: { clean_discounted_price: { $lt: 10 } } }, { $sort: { clean_discounted_price: 1 } }, { $limit: 10 }, { $project: { _id: 0, title: "$name", discounted_price: "$commercial_info.Discounted Price" } } ]);
print("overload");
executeQuery(db.games_ranking_commercial_data, [ { $lookup: { from: "games_description", localField: "game_name", foreignField: "name", as: "description" } }, { $unwind: { path: "$description", preserveNullAndEmptyArrays: true } }, { $match: { "description.overall_player_rating": "Overwhelmingly Positive" } }, { $addFields: { clean_discounted_price: { $cond: { if: { $eq: ["$discounted_price", "Free"] }, then: 0, else: { $toDouble: { $trim: { input: { $replaceAll: { input: "$discounted_price", find: ",", replacement: "" } }, chars: " $" } } } } } } }, { $match: { clean_discounted_price: { $lt: 10 } } }, { $sort: { clean_discounted_price: 1 } }, { $limit: 10 }, { $project: { _id: 0, title: "$game_name", discounted_price: "$discounted_price", rank: "$rank", release_date: "$release_date" } } ]);

print('6)Complex:Which games are rated as both "funny" and "helpful" by users?')
print("fusion");
executeQuery(db.games_with_reviews, [ { $unwind: "$reviews" }, { $match: { "reviews.funny": { $gt: 0 }, "reviews.helpful": { $gt: 0 } } }, { $project: { game_name: "$name", review: "$reviews.review", funny: "$reviews.funny", helpful: "$reviews.helpful", game_info: 1 } } ]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $match: { "funny": { $gt: 0 }, "helpful": { $gt: 0 } } }, { $project: { _id: 0, game_name: "$game_name", rank: 1, review: "$review", funny: "$funny", helpful: "$helpful" } }, { $limit: 10 } ]);

print("7)Advanced:What are the most helpful reviews and their corresponding game rankings?");
print("fusion");
executeQuery(db.games_with_reviews, [ { $unwind: "$reviews" }, { $match: { "reviews.funny": { $gt: 0 }, "reviews.helpful": { $gt: 0 } } }, { $project: { game_name: "$name", review: "$reviews.review", funny: "$reviews.funny", helpful: "$reviews.helpful", game_info: 1 } } ]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $match: { "funny": { $gt: 0 }, "helpful": { $gt: 0 } } }, { $project: { _id: 0, game_name: "$game_name", rank: 1, review: "$review", funny: "$funny", helpful: "$helpful" } }, { $limit: 10 } ]);

print("8)advanced: Which games have more than 10 reviews but fewer than 3 English reviews?")
print("fusion");
executeQuery(db.games_with_reviews, [ { $unwind: "$reviews" }, { $group: { _id: "$name", total_reviews: { $sum: 1 }, english_reviews: { $sum: { $cond: [ { $eq: ["$reviews.language", "English"] }, 1, 0 ] } } } }, { $match: { total_reviews: { $gt: 10 }, english_reviews: { $lt: 3 } } }, { $project: { _id: 1, total_reviews: 1, english_reviews: 1 } } ]);
print("overload");
executeQuery(db.games_ranking_with_reviews_overload, [ { $group: { _id: "$game_name", total_reviews: { $sum: 1 }, english_reviews: { $sum: { $cond: [ { $eq: ["$reviews.language", "English"] }, 1, 0 ] } } } }, { $match: { total_reviews: { $gt: 10 }, english_reviews: { $lt: 3 } } }, { $project: { _id: 1, total_reviews: 1, english_reviews: 1 } }, { $limit: 10 } ]);