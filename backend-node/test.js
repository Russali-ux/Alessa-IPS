import { query } from './src/config/database.js';

async function test() {
    try {
        await query(`
            UPDATE workspace_members 
            SET deleted_at = NOW(), status = 'INACTIVE'
            WHERE workspace_id = $1 AND user_id = $2
        `, ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']);
        console.log('Success');
    } catch (e) {
        console.error(e.message);
    }
    process.exit(0);
}
test();
