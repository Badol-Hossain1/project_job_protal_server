const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
app.use(cors({
  origin: ['http://localhost:5173','https://project-job-protal.web.app','http://project-job-protal.firebaseapp.com'], 
  credentials: true,
   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',               
}));
app.use(express.json());
app.use(cookieParser())


const verifyToken = (req,res,next) => {
  const token = req.cookies?.token;
  console.log("🚀 ~ verifyToken ~ token:", token)
  if(!token){
    return res.send({massage:'unAuthorized access'})
  }
  jwt.verify(token,process.env.SECRET,(err,decoded)=> {
    if(err){
      return res.status(401).send({massage: 'bad request '})
    }
    req.user = decoded
    next()
  })
}




// mongodb 



const uri = `mongodb+srv://${process.env.DB}:${process.env.PASS}@cluster0.l5injar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    //  find all the jobs here 
     const db = client.db('job_hounter')
     const jobsCollection = db.collection('jobs') 
     const applicationCollection = db.collection('applications')
    app.get('/jobs', async (req, res) => {
      const email = req.query.email
      let query = {}
      if(email){
        query = {hr_email: email}
      }
        const cursor = jobsCollection.find(query)
        const result = await cursor.toArray()
       

        res.send(result)

    })

    // find by id 
    app.get('/jobs/:id', async (req,res)=> {
      const id =   req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })

    // view all applicant 
    app.get('/job-applications/jobs/:job_id',async(req,res) => {
      const jobId = req.params.job_id
    
      const query = {job_id: jobId}
      const result = await applicationCollection.find(query).toArray()
      res.send(result)
    })

    // job application 
    app.post('/job-applications', async (req,res) => {
        const application = req.body
        const result = await applicationCollection.insertOne(application)
        // const id = application.job_id
        
        // const query = {_id: new ObjectId(id)}
        // const job = await jobsCollection.findOne(query)
        // const count = 0;
        // if(job.applicationCount){
        //   count = job.applicationCount + 1
        // }
        // else{
        //   count = 1
        // }

        // const filter = {_id: new ObjectId(id)}
        

         

          
      // const updateDoc = {
      //     $set: {
      //        applicationCount: count
      //    },
      // };

      // const updateResult = await jobsCollection.updateOne(filter,updateDoc)


        res.send(result)
    })

    // find all apply job 
    app.get('/job-application',verifyToken, async (req, res) => {
        const email = req.query.email

        const query = {applicant_email: email}
        if(req?.user?.email != email ){
          return res.status(403).send({massage: 'sorry cant access'})
        }
       
        const result = await applicationCollection.find(query).toArray()
        // find jobs details by id 
        for(const job of result){
           
          
            const query1 = {_id: new ObjectId(job.job_id)}
            const result1 = await jobsCollection.findOne(query1)
            if(result1){
                job.title= result1.title;
                job.company = result1.company;
                job.company_logo = result1.company_logo;
                job.location = result1.location;
                job.hr_email= result1.hr_email;
                job.company_logo= result1.company_logo
            }
        }
        res.send(result)


    })



    // new jobs added 
    app.post('/jobs' , async (req,res) => {
      const data = req.body
      const result = await jobsCollection.insertOne(data)

    
      res.send(result)
    })

    // delete 
    app.delete('/job-applications/:id',async (req,res)=> {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await applicationCollection.deleteOne(query)
      res.send(result)



    })

    // update job status 
    app.patch('/job-applications/:id' ,async(req,res) => {
      const id = req.params.id
      const data = req.body
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          status: data.status
        }
      }
      const result = await jobsCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    // auth 
    app.post('/jwt',async(req,res)=> {
      const user = req.body
      const token =  jwt.sign(user,process.env.SECRET,{expiresIn:'1h'})
     
      res
      .cookie('token',token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",

      })
      .send({success: true})

    })

    app.post('/logout',(req,res)=> {
      res.clearCookie('token',{
        httpOnly: true,
        secure:process.env.NODE_ENV === "production",
      }).send({success:true})
    })



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})