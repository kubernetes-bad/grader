import express from 'express';
import bodyParser from 'body-parser';
import config from 'config';
import db from './db.mjs';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const INPUT_TABLE = config.get('data.tables.input');
const GRADES_TABLE = config.get('data.tables.grades');
const ID_COL = config.get('data.id');

// init db if not inited
const hasInputTable = await db.schema.hasTable(INPUT_TABLE);
const hasGradesTable = await db.schema.hasTable(GRADES_TABLE);

if (!hasInputTable) {
  await db.schema.createTable(INPUT_TABLE, (table) => {
    table.increments(ID_COL).unique();

    const titleField = Object.keys(config.get('data.title'))[0];
    table.text(titleField);

    Object.keys(config.get('data.fields')).forEach((field) => {
      table.text(field);
    });
  })
  console.log('Input data table was not found - empty data table created');
}

if (!hasGradesTable) {
  await db.schema.createTable(GRADES_TABLE, (table) => {
    table.increments(ID_COL).unique();
    table.string('grade');
  });
  console.log('Grades data table was not found - empty data table created');
}

app.get('/next', async (req, res) => {
  const fields = Object.entries(config.get('data.fields'))
    .reduce((acc, [column, label]) => {
      acc[column] = {
        label,
        ref: db.ref(`${INPUT_TABLE}.${column}`).as(column),
      };
      return acc;
    }, {});

  const refs = Object.values(fields).map((field) => field.ref);
  const [titleColumn] = Object.entries(config.get('data.title')).pop();

  try {
    const record = await db(INPUT_TABLE)
      .select([
        db.ref(`${INPUT_TABLE}.${ID_COL}`).as('id'),
        db.ref(`${INPUT_TABLE}.${titleColumn}`).as('title'),
        ...refs,
      ])
      .leftJoin(GRADES_TABLE, `${GRADES_TABLE}.${ID_COL}`, `${INPUT_TABLE}.${ID_COL}`)
      .whereNull(`${GRADES_TABLE}.${ID_COL}`)
      .orderByRaw('RAND()')
      .first();

    if (!record) {
      res.json({ success: true, message: 'No ungraded records available' });
      return;
    }

    record.id = record[ID_COL];
    res.json({ success: true, record });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/grade', async (req, res) => {
  try {
    const { id, grade } = req.body;

    const recordExists = await db(INPUT_TABLE)
      .select(ID_COL)
      .where({ id })
      .first();

    if (!recordExists) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const alreadyGraded = await db(GRADES_TABLE)
      .select(ID_COL)
      .where({ id })
      .first();

    if (alreadyGraded) {
      return res.status(400).json({ success: false, message: 'Record already graded' });
    }

    console.log(`GRADED ${id} AS ${grade}`);
    await db(GRADES_TABLE).insert({ id, grade });

    res.json({ success: true, message: 'Grade recorded successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/progress', async (req, res) => {
  try {
    const totalQuery = db(INPUT_TABLE)
      .leftJoin(GRADES_TABLE, `${INPUT_TABLE}.${ID_COL}`, `${GRADES_TABLE}.${ID_COL}`)
      .whereNull(`${GRADES_TABLE}.grade`)
      .count(`${INPUT_TABLE}.${ID_COL}`, 'count')
      .select(db.raw("'ungraded' AS category"));

    const gradedQuery = db(INPUT_TABLE)
      .leftJoin(GRADES_TABLE, `${INPUT_TABLE}.${ID_COL}`, `${GRADES_TABLE}.${ID_COL}`)
      .whereNotNull(`${GRADES_TABLE}.grade`)
      .count(`${INPUT_TABLE}.${ID_COL}`, 'count')
      .select(db.raw("'graded' AS category"));

    const result = await db.raw('? UNION ?', [totalQuery, gradedQuery]);
    const [ungraded, graded] = result[0].reduce((acc, row) => {
      const count = Object.values(row).find(val => typeof val === 'number');
      acc.push(count);
      return acc;
    }, []);

    const total = graded + ungraded;

    const progress = {
      total: total || 0,
      graded: graded || 0,
    };

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.get('/config', (req, res) => {
  res.send({
    id: ID_COL,
    title: config.get('data.title'),
    fields: config.get('data.fields'),
    buttons: config.get('data.buttons'),
  });
});

// health checks
app.get('/health', (req, res) => {
  res.send('OK');
});

const port = config.get('port');
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
