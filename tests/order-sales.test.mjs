import assert from 'node:assert/strict';
import {isRecognizedOrder} from '../utils/order-sales.ts';
assert.equal(isRecognizedOrder({source_type:'POS',status:'納品済'}),true);
for (const status of ['取消済','pending','voided',null]) assert.equal(isRecognizedOrder({source_type:'POS',status}),false);
assert.equal(isRecognizedOrder({source_type:'手入力',status:'新規受注'}),true);
console.log('PASS: dashboard POS inclusion and cancellation exclusion');
