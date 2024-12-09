// if empty everywhere, make sure you used 'use <db_name>' before
// make sure each collection contains the right amount of documents
let tmp = db.games_with_reviews.count();
if(tmp==290) {
    print("games_with_reviews loaded");
} else {
    print("games_with_reviews: " + tmp);
}
tmp = db.games_ranking_commercial_data.count();
if(tmp==499) {
    print("games_ranking_commercial_data loaded");
} else {
    print("games_ranking_commercial_data: " + tmp);
}
tmp = db.games_ranking_with_reviews_overload.count();
if(tmp==925320) {
    print("games_ranking_with_reviews_overload loaded");
} else {
    print("games_ranking_with_reviews_overload: " + tmp);
}
tmp = db.denormalized_games_rank_reviews10.count();
if(tmp==992153) {
    print("denormalized_games_rank_reviews10 loaded");
} else {
    print("denormalized_games_rank_reviews10: " + tmp);
}
tmp = db.games_ranking.count();
if(tmp==672) {
    print("games_ranking loaded");
} else {
    print("games_ranking: " + tmp);
}
tmp = db.commercial_data.count();
if(tmp==71700) {
    print("commercial_data loaded");
} else {
    print("commercial_data: " + tmp);
}