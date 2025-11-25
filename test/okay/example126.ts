// Correct: This parameter binding
interface Database {
  connect(this: Database): void;
}

const db: Database = {
  connect() {
    console.log(this);
  }
};

const connectFn = db.connect.bind(db);
connectFn();
