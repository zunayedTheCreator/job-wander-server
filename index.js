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
      const { ObjectId } = require('mongodb');
      
      const userCollection = client.db('jobWander').collection('user');
      const jobCollection = client.db('jobWander').collection('job');

    // job api
    app.get('/job', async (req, res) => {
        const cursor = jobCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    });
        
    app.get('/job/:identifier', async (req, res) => {
    const identifier = req.params.identifier;
    try {
        let result;
        if (ObjectId.isValid(identifier)) {
        result = await jobCollection.findOne({ _id: new ObjectId(identifier) });
        } else {
        result = await jobCollection.find({ $or: [{ user_email: identifier }, { job_category: identifier }] }).toArray();
        }
        if (!result) {
        return res.status(404).send('Item not found');
        }
        res.send(result);
    } catch (error) {
        console.error('Error retrieving item:', error);
        res.status(500).send('Error retrieving item');
    }
    });

    app.get('/job', async (req, res) => {
        const { query } = req.query;

        try {
            const result = await jobCollection.find({
                job_title: { $regex: query, $options: 'i' }
            }).toArray()
            res.json(result);
        } catch (error) {
            console.error('Error searching jobs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/job', async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobCollection.insertOne(newJob)
      res.send(result)
    })

    app.put('/job/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedItem = req.body;
      const item = {
        $set: {
            user_name: updatedItem.user_name, 
            user_email: updatedItem.user_email, 
            job_title: updatedItem.job_title, 
            job_category: updatedItem.job_category, 
            salary: updatedItem.salary, 
            description: updatedItem.description, 
            posting_date: updatedItem.posting_date, 
            deadline_date: updatedItem.deadline_date, 
            photo: updatedItem.photo,
            total_applicants: updatedItem.total_applicants
        }
      }

      const result = await jobCollection.updateOne(filter, item, option)
      res.send(result)
    })

    app.delete('/job/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        try {
          const result = await jobCollection.deleteOne(query);
          res.send(result);
        } catch (error) {
          console.error('Error deleting item:', error);
          res.status(500).send('Error deleting item');
        }
      });

    // user api
    app.get('/user', async(req, res) => {
        const cursor = userCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/user/:email', async (req, res) => {
        const email = req.params.email;
        const query = {email: email}
        const cursor = userCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });

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