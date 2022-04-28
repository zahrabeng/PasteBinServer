import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

// get all pastes
app.get("/pastes", async (req, res) => {
  const result = await client.query('SELECT * FROM pastes');
  res.json(result.rows);
});

//get paste with id
app.get("/pastes/:id", async(req,res) => {
  const id = parseInt(req.params.id)
  const text = ('SELECT * FROM pastes WHERE id = $1')
  const value = [`${id}`] 
  const result = await client.query(text, value) 
  res.json(result.rows)
})


//post new paste
app.post("/pastes", async (req,res) =>{
  const {language, code , title} = req.body;
  const text = 'INSERT INTO pastes (language, code, title) VALUES ($1, $2 , $3) RETURNING * ';
  const value = [`${language}`, `${code}`, `${title}`];
  const result = await client.query(text, value);
  const createdPaste = result.rows[0]
  res.status(201).json({
    status:"sucess",
    data: {
      paste: createdPaste,
    }
  });
});

//edit existing paste
app.put("/pastes/:id", async (req,res) =>{
  const id = parseInt(req.params.id)
  const {language, code, title} = req.body;
  const text = 'UPDATE pastes SET language = $1, code = $2 , title = $4 WHERE id = $3 RETURNING *';
  const value = [`${language}`, `${code}`, `${id}` , `${title}`];
  const result = await client.query(text, value);

  if (result.rowCount === 1){
    const editedPaste = result.rows[0]
    res.status(200).json({
      status: "success",
      data: {
        paste: editedPaste
      },
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Cannot find paste"
      },
    })
  }
});

//delete existing paste
app.delete("/pastes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const text = "DELETE FROM pastes WHERE id = $1";
  const value = [`${id}`];
  const result = await client.query(text, value);

  if (result.rowCount === 1) {
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a paste with that id",
      },
    });
  }
})

// get all comments
app.get('pastes/:id/comments', async (req, res) => {
  const id = parseInt(req.params.id);
  const text = "SELECT comments FROM pastes WHERE id = $1"
  const value = [`${id}`]
  const result = await client.query(text, value);
  res.json(result.rows);
});

// add a new comment 

// delete an existing comment

//Start the server on the given port


const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
