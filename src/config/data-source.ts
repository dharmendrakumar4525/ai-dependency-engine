import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './database.config';


export default new DataSource({
  ...getDataSourceOptions(),
  migrations: [
    'dist/migrations/1738636800000-TaskEntityPrimaryKeyFix.js',
    'dist/migrations/1738637000000-JobErrorFields.js',
  ],
});
