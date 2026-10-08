import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMapsInput } from '../src/gmaps.js';

test('đọc toạ độ và tên từ link Google Maps đầy đủ, ưu tiên ghim địa điểm', () => {
  const r = parseMapsInput('https://www.google.com/maps/place/B%C3%A1nh+x%C3%A8o+B%C3%A0+D%C6%B0%E1%BB%A1ng/@16.0490,108.2170,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d16.0497!4d108.2185');
  assert.deepEqual(r, { ok: true, lat: 16.0497, lng: 108.2185, name: 'Bánh xèo Bà Dưỡng' });
});

test('đọc toạ độ từ @, ?q=, ?query= và chuỗi toạ độ thuần', () => {
  assert.equal(parseMapsInput('https://www.google.com/maps/@16.0544,108.2022,15z').lat, 16.0544);
  assert.equal(parseMapsInput('https://maps.google.com/?q=16.06,108.25').lng, 108.25);
  assert.equal(parseMapsInput('https://www.google.com/maps/search/?api=1&query=16.07,108.22').lat, 16.07);
  assert.deepEqual(parseMapsInput(' 16.0612, 108.2271 '), { ok: true, lat: 16.0612, lng: 108.2271, name: '' });
  assert.equal(parseMapsInput('16.0612 108.2271').ok, true);
});

test('báo lý do khi không đọc được', () => {
  assert.equal(parseMapsInput('').reason, 'empty');
  assert.equal(parseMapsInput('https://maps.app.goo.gl/AbC123').reason, 'short');
  assert.equal(parseMapsInput('Bánh xèo Bà Dưỡng').reason, 'nocoords');
  assert.equal(parseMapsInput('95, 108').reason, 'range');
  assert.equal(parseMapsInput('0, 0').reason, 'range');
});
