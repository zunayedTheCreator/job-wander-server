const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.kbuydyl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('jobWander').collection('user');

    // user api
    app.get('/user', async(req, res) => {
        const cursor = userCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.post('/user', async(req, res) => {
        const newUser = req.body;
        console.log(newUser);
        const result = await userCollection.insertOne(newUser)
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Surver is runningg :)))')
})

app.listen(port, () => {
    console.log(`Server is runnning on port: ${port}`);
})