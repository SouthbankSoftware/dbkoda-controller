db.explains.find({ "user.age": { $gt: 10 } });

db.explains.find({
  "user.name.last": "Hall"
});

db.explains.find({
  $and: [
    {
      name: { $type: "string", $exists: true }
    },
    {
      listPrice: { $type: "double", $exists: true }
    },
    {
      sku: { $type: "int", $exists: true }
    }
  ]
});

db.scores.findOneAndDelete({ name: "A. MacDyver" }, { sort: { points: 1 } });

db.scores.findOneAndReplace(
  { score: { $lt: 20000 } },
  { team: "Observant Badgers", score: 20000 }
);

db.scores.findOneAndUpdate({ name: "R. Stiles" }, { $inc: { points: 5 } });

try {
  db.orders.deleteOne({ _id: ObjectId("563237a41a4d68582c2509da") });

  db.orders.deleteMany({ stock: "Brent Crude Futures", limit: { $gt: 48.88 } });
} catch (e) {}

db.people.update(
   { name: "Andy" },
   {
      name: "Andy",
      rating: 1,
      score: 1
   },
   { upsert: true,
      multi: false }
)

db.people.update(
   { name: "Andy" },
   {
      name: "Andy",
      rating: 1,
      score: 1
   },
   { upsert: true,
      multi: true }
)
db.products.insert(
   [
     { _id: 11, item: "pencil", qty: 50, type: "no.2" },
     { item: "pen", qty: 20 },
     { item: "eraser", qty: 25 }
   ]
)
db.products.insert(
    { item: "envelopes", qty : 100, type: "Clasp" },
    { writeConcern: { w: "majority", wtimeout: 5000 } }
)







