const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware
app.use(
  cors({
  origin: ['http://localhost:5173', 'https://job-wander.web.app/', 'https://job-wander.firebaseapp.com/'],
  credentials: true,
  }),
  )
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.VITE_USER}:${process.env.VITE_PASS}@cluster0.kbuydyl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log('middleware token', token);
  if (!token) {
    return res.status(401).send({message: 'unauthorized token'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'unauthorized token'}) 
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();
      const { ObjectId } = require('mongodb');
      
      const userCollection = client.db('jobWander').collection('user');
      const jobCollection = client.db('jobWander').collection('job');
      const appliedCollection = client.db('jobWander').collection('appliedJob');

    // auth api
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({success: true})
    })

    app.post('/logout', async(req, res) => {
      const user = req.body;
      console.log('logout', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

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
          } else if (identifier.includes('Jobs')) {
              result = await jobCollection.find({ job_category: identifier }).toArray();
          } else if (identifier.includes('@')) {
              result = await jobCollection.find({ user_email: identifier }).toArray();
          } else {
              result = await jobCollection.find({ 
                  job_title: { $regex: identifier, $options: 'i' }
              }).toArray();
          }
  
          if (!result) {
              return res.status(404).send('Item not found');
          }
  
          res.send(result);
      } catch (error) {
          console.error('Error retrieving item:', error);
          return res.status(500).send('Error retrieving item');
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

    app.patch('/job/:id', async (req, res) => {
        const id = req.params.id;
        try {
            const filter = { _id: new ObjectId(id) };
            const update = { $inc: { total_applicants: 1 } };
            const result = await jobCollection.updateOne(filter, update);
            res.send(result);
        } catch (error) {
            console.error('Error updating document:', error);
            res.status(500).send('Error updating document');
        }
    });
    

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
    
    // applied jobs api
    app.get('/applied', async(req, res) => {
        const cursor = appliedCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })
    
    app.get('/applied/:email', logger, verifyToken, async (req, res) => {

        console.log(req.params.email)
        console.log('token owner', req.user.email)
        if (req.params.email !== req.user.email) {
          return res.status(403).send({massage: 'forbidden access'})
        }
        const email = req.params.email;
        const query = {user_email: email}
        const cursor = appliedCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });
    
    app.post('/applied', async(req, res) => {
        const newUser = req.body;
        console.log(newUser);
        const result = await appliedCollection.insertOne(newUser)
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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