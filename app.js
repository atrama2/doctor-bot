// app.js

const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const { start } = require('repl');

// Connect to SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) UNIQUE,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating table: ' + err.message);
        } else {
            console.log('Table "options" is ready.');
        }
    });

    db.run(`CREATE TRIGGER IF NOT EXISTS update_timestamp
        AFTER UPDATE ON options
        FOR EACH ROW
        BEGIN
            UPDATE options SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;`, (err) => {
        if (err) {
            console.error('Error creating trigger: ' + err.message);
        } else {
            console.log('Trigger "update_timestamp" is ready.');
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS gowajee (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user VARCHAR(255),
        transcript TEXT,
        start_time TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating table "gowajee": ' + err.message);
        } else {
            console.log('Table "gowajee" is ready.');
        }
    });
});

function insertIntoGowajee(user, transcript, start_time) {
    start_time = Math.floor(start_time);
    db.run(`INSERT INTO gowajee (user, transcript, start_time) VALUES (?, ?, ?)`, [user, transcript, start_time], function(err) {
        if (err) {
            console.error('Error inserting into gowajee table: ' + err.message);
        } else {
            console.log('Record inserted into gowajee table successfully');
        }
    });
}

async function clearGowajeeTable() {
    db.run(`DELETE FROM gowajee`, (err) => {
        if (err) {
            console.error('Error clearing gowajee table: ' + err.message);
        } else {
            console.log('Gowajee table cleared successfully');
        }
    });
}

async function getGowajee() {
    let startTime = null;
    let rows = [];

    // Wrap db.get in a Promise
    await new Promise((resolve, reject) => {
        db.get(`SELECT updated_at FROM options WHERE name = 'recording'`, (err, row) => {
            if (err) {
                console.error('Error querying the database: ' + err.message);
                reject(err);
            } else {
                startTime = row ? new Date(row.updated_at).getTime() : null;
                console.log(startTime);
                resolve();
            }
        });
    });

    // Wrap db.all in a Promise
    await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM gowajee ORDER BY start_time ASC`, (err, result) => {
            if (err) {
                console.error('Error querying gowajee table: ' + err.message);
                reject(err);
            } else {
                for (let i = 0; i < result.length; i++) {
                    if (startTime < result[i].start_time) {
                        rows.push(result[i]);
                        console.log('push this row');
                    } else {
                        console.log('skip this row', startTime, ' more ', result[i].start_time);
                    }
                }
                resolve();
            }
        });
    });

    return rows;
}


// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Define a simple route
app.get('/', (req, res) => {
    if (req.query.user === 'doctor') {
        return res.sendFile(path.join(__dirname, 'doctor.html'));
    } else if (req.query.user === 'patient') {
        return res.sendFile(path.join(__dirname, 'patient.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.get('/doctor', (req, res) => {
    res.sendFile(path.join(__dirname, 'doctor.html'));
} );

app.get('/patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'patient.html'));
} );

app.get('/api/recording', async (req, res) => {
    try {
        await clearGowajeeTable();
    } catch (error) {
        console.error('Error clearing gowajee table: ' + error.message);
        return res.status(500).json({ error: 'Error clearing gowajee table' });
    }

    const name = 'recording';
    const value = 'true';
    const currentTimestamp = Math.floor(Date.now()/1000);

    db.run(`INSERT INTO options (name, value, created_at, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET value=excluded.value`, [name, value, currentTimestamp, currentTimestamp], function(err) {
        if (err) {
            console.error('Error inserting or updating record: ' + err.message);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json({ message: 'Record inserted or updated successfully', changes: this.changes });
        }
    });
});

app.get('/api/stop-record', async (req, res) => {

    try {
        const gowajeeData = await getGowajee();
        console.log('Data from gowajee:', gowajeeData);
        res.json({'message': gowajeeData});
    } catch (error) {
        console.error('Error fetching data from gowajee:', error);
        return res.status(500).json({ error: 'Error fetching data from gowajee' });
    }

    db.run(`DELETE FROM options WHERE name = 'recording'`, function(err) {
        if (err) {
            console.error('Error deleting record: ' + err.message);
            // res.status(500).json({ error: 'Database error' });
        } else {
            console.log('Record deleted successfully');
            // res.json({ message: 'Record deleted successfully' });
        }
    });

});

// Define an example API endpoint
app.post('/api/pulse/transcribe', (req, res) => {
    const { audioData } = req.body;
    const requestTime = Date.now()/1000;
    if (!audioData) {
        return res.status(400).json({ error: 'audioData is required' });
    }

    axios.post('https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe', {
        audioData: audioData
    }, {
        headers: {
        'x-api-key': 'gwj_live_5028b9975d2746c280437132750ef2f6_0cjhi'
        }
    })
    .then(response => {
        response.data.output.results.forEach(result => {
            const user = req.body.user;
            const transcript = result.transcript;
            const start_time = requestTime + (result.startTime + result.endTime);
            // Assuming you have a function to insert into the table 'gowajee'
            insertIntoGowajee(user, transcript, start_time);
        });
        
        res.json(response.data);
    })
    .catch(error => {
        console.error('Error transcribing audio:', error);
        res.status(500).json({ error: 'Error transcribing audio' });
    });

//   res.json({ message: 'Audio data received successfully!' });

});

// Start the server
app.listen(port, () => {
  console.log(`API server is running at http://localhost:${port}`);
});