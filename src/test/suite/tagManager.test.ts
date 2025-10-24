/**
 * Unit tests for TagManager
 * Tests tag validation, normalization, filtering, statistics, and tag operations
 */

import * as assert from 'assert';
import { TagManager } from '../../tagManager.js';
import { NoteCategory } from '../../tagTypes.js';
import { Note } from '../../types.js';

suite('TagManager Test Suite', () => {
	/**
	 * Helper to create a mock note
	 */
	function createMockNote(
		id: string,
		content: string,
		tags?: string[]
	): Note {
		return {
			id,
			content,
			author: 'Test Author',
			filePath: '/workspace/test.ts',
			lineRange: { start: 0, end: 0 },
			contentHash: `hash-${id}`,
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
			history: [],
			isDeleted: false,
			tags: tags || []
		};
	}

	suite('Predefined Categories', () => {
		test('should return all predefined categories', () => {
			const categories = TagManager.getPredefinedCategories();
			assert.strictEqual(categories.length, 7);
			assert.ok(categories.includes(NoteCategory.TODO));
			assert.ok(categories.includes(NoteCategory.FIXME));
			assert.ok(categories.includes(NoteCategory.QUESTION));
			assert.ok(categories.includes(NoteCategory.NOTE));
			assert.ok(categories.includes(NoteCategory.BUG));
			assert.ok(categories.includes(NoteCategory.IMPROVEMENT));
			assert.ok(categories.includes(NoteCategory.REVIEW));
		});

		test('should identify predefined category - exact case', () => {
			assert.strictEqual(TagManager.isPredefinedCategory('TODO'), true);
			assert.strictEqual(TagManager.isPredefinedCategory('FIXME'), true);
			assert.strictEqual(TagManager.isPredefinedCategory('BUG'), true);
		});

		test('should not identify predefined category - wrong case', () => {
			assert.strictEqual(TagManager.isPredefinedCategory('todo'), false);
			assert.strictEqual(TagManager.isPredefinedCategory('Todo'), false);
			assert.strictEqual(TagManager.isPredefinedCategory('fixme'), false);
		});

		test('should not identify custom tags as predefined', () => {
			assert.strictEqual(TagManager.isPredefinedCategory('custom'), false);
			assert.strictEqual(TagManager.isPredefinedCategory('my-tag'), false);
			assert.strictEqual(TagManager.isPredefinedCategory(''), false);
		});

		test('should get style for predefined category', () => {
			const todoStyle = TagManager.getTagStyle('TODO');
			assert.strictEqual(todoStyle.color, '#007ACC');
			assert.strictEqual(todoStyle.icon, 'check');
			assert.strictEqual(todoStyle.description, 'Tasks that need to be completed');

			const bugStyle = TagManager.getTagStyle('BUG');
			assert.strictEqual(bugStyle.color, '#FF8C00');
			assert.strictEqual(bugStyle.icon, 'bug');
		});

		test('should get default style for custom tag', () => {
			const customStyle = TagManager.getTagStyle('custom');
			assert.strictEqual(customStyle.color, '#858585');
			assert.strictEqual(customStyle.description, 'Custom tag');
			assert.strictEqual(customStyle.icon, undefined);
		});
	});

	suite('Tag Validation', () => {
		test('should validate valid tag', () => {
			const result = TagManager.validateTag('valid-tag');
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.normalizedTag, 'valid-tag');
			assert.strictEqual(result.error, undefined);
		});

		test('should validate tag with spaces (trimmed)', () => {
			const result = TagManager.validateTag('  spaced  ');
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.normalizedTag, 'spaced');
		});

		test('should reject empty tag', () => {
			const result = TagManager.validateTag('');
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot be empty');
		});

		test('should reject whitespace-only tag', () => {
			const result = TagManager.validateTag('   ');
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot be empty');
		});

		test('should reject tag with comma', () => {
			const result = TagManager.validateTag('tag,with,commas');
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot contain commas');
		});

		test('should reject tag with newline', () => {
			const result = TagManager.validateTag('tag\nwith\nnewline');
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot contain newlines');
		});

		test('should reject tag with carriage return', () => {
			const result = TagManager.validateTag('tag\rwith\rreturn');
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot contain newlines');
		});

		test('should reject tag exceeding 50 characters', () => {
			const longTag = 'a'.repeat(51);
			const result = TagManager.validateTag(longTag);
			assert.strictEqual(result.isValid, false);
			assert.strictEqual(result.error, 'Tag cannot exceed 50 characters');
		});

		test('should accept tag with exactly 50 characters', () => {
			const maxTag = 'a'.repeat(50);
			const result = TagManager.validateTag(maxTag);
			assert.strictEqual(result.isValid, true);
		});

		test('should accept tag with special characters (except restricted ones)', () => {
			const result = TagManager.validateTag('tag-with_special.chars#123');
			assert.strictEqual(result.isValid, true);
		});
	});

	suite('Tag Normalization', () => {
		test('should normalize predefined category to uppercase', () => {
			assert.strictEqual(TagManager.normalizeTag('todo'), 'TODO');
			assert.strictEqual(TagManager.normalizeTag('Todo'), 'TODO');
			assert.strictEqual(TagManager.normalizeTag('TODO'), 'TODO');
			assert.strictEqual(TagManager.normalizeTag('fixme'), 'FIXME');
			assert.strictEqual(TagManager.normalizeTag('bug'), 'BUG');
		});

		test('should preserve casing for custom tags', () => {
			assert.strictEqual(TagManager.normalizeTag('MyTag'), 'MyTag');
			assert.strictEqual(TagManager.normalizeTag('custom'), 'custom');
			assert.strictEqual(TagManager.normalizeTag('Custom'), 'Custom');
		});

		test('should trim whitespace', () => {
			assert.strictEqual(TagManager.normalizeTag('  tag  '), 'tag');
			assert.strictEqual(TagManager.normalizeTag('  TODO  '), 'TODO');
		});
	});

	suite('Validate and Normalize Tags', () => {
		test('should validate and normalize multiple tags', () => {
			const tags = ['TODO', 'custom', 'bug', 'my-tag'];
			const result = TagManager.validateAndNormalizeTags(tags);

			assert.strictEqual(result.valid.length, 4);
			assert.strictEqual(result.invalid.length, 0);
			assert.ok(result.valid.includes('TODO'));
			assert.ok(result.valid.includes('custom'));
			assert.ok(result.valid.includes('BUG'));
			assert.ok(result.valid.includes('my-tag'));
		});

		test('should remove duplicates', () => {
			const tags = ['TODO', 'todo', 'TODO', 'custom', 'custom'];
			const result = TagManager.validateAndNormalizeTags(tags);

			assert.strictEqual(result.valid.length, 2);
			assert.ok(result.valid.includes('TODO'));
			assert.ok(result.valid.includes('custom'));
		});

		test('should separate valid and invalid tags', () => {
			const tags = ['TODO', 'tag,with,comma', 'valid', ''];
			const result = TagManager.validateAndNormalizeTags(tags);

			assert.strictEqual(result.valid.length, 2);
			assert.strictEqual(result.invalid.length, 2);
			assert.ok(result.valid.includes('TODO'));
			assert.ok(result.valid.includes('valid'));
		});

		test('should handle empty array', () => {
			const result = TagManager.validateAndNormalizeTags([]);
			assert.strictEqual(result.valid.length, 0);
			assert.strictEqual(result.invalid.length, 0);
		});

		test('should trim and normalize before duplicate check', () => {
			const tags = ['  TODO  ', 'todo', '  custom  ', 'custom'];
			const result = TagManager.validateAndNormalizeTags(tags);

			assert.strictEqual(result.valid.length, 2);
			assert.ok(result.valid.includes('TODO'));
			assert.ok(result.valid.includes('custom'));
		});
	});

	suite('Filter Notes by Tags', () => {
		const note1 = createMockNote('note1', 'Content 1', ['TODO', 'BUG']);
		const note2 = createMockNote('note2', 'Content 2', ['FIXME', 'REVIEW']);
		const note3 = createMockNote('note3', 'Content 3', ['TODO', 'REVIEW']);
		const note4 = createMockNote('note4', 'Content 4', ['custom']);
		const note5 = createMockNote('note5', 'Content 5', []);
		const notes = [note1, note2, note3, note4, note5];

		test('should filter by single tag - OR logic', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO']
			});

			assert.strictEqual(result.length, 2);
			assert.ok(result.some(n => n.id === 'note1'));
			assert.ok(result.some(n => n.id === 'note3'));
		});

		test('should filter by multiple tags - OR logic (default)', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO', 'FIXME']
			});

			assert.strictEqual(result.length, 3);
			assert.ok(result.some(n => n.id === 'note1'));
			assert.ok(result.some(n => n.id === 'note2'));
			assert.ok(result.some(n => n.id === 'note3'));
		});

		test('should filter by multiple tags - AND logic', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO', 'REVIEW'],
				requireAllTags: true
			});

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, 'note3');
		});

		test('should filter by multiple tags - AND logic with no matches', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO', 'FIXME'],
				requireAllTags: true
			});

			assert.strictEqual(result.length, 0);
		});

		test('should exclude notes with excluded tags', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO', 'FIXME', 'REVIEW'],
				excludeTags: ['BUG']
			});

			assert.strictEqual(result.length, 2);
			assert.ok(result.some(n => n.id === 'note2'));
			assert.ok(result.some(n => n.id === 'note3'));
			assert.ok(!result.some(n => n.id === 'note1')); // Has BUG
		});

		test('should exclude notes with any excluded tag', () => {
			const result = TagManager.filterNotesByTags(notes, {
				excludeTags: ['TODO', 'BUG']
			});

			// note1, note3 have TODO, note1 also has BUG - all excluded
			assert.strictEqual(result.length, 3);
			assert.ok(result.some(n => n.id === 'note2'));
			assert.ok(result.some(n => n.id === 'note4'));
			assert.ok(result.some(n => n.id === 'note5'));
		});

		test('should return all notes when no filters provided', () => {
			const result = TagManager.filterNotesByTags(notes, {});
			assert.strictEqual(result.length, 5);
		});

		test('should handle notes with no tags', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: ['TODO']
			});

			// note5 has no tags, should not be included
			assert.ok(!result.some(n => n.id === 'note5'));
		});

		test('should handle empty tag arrays in filters', () => {
			const result = TagManager.filterNotesByTags(notes, {
				includeTags: [],
				excludeTags: []
			});

			assert.strictEqual(result.length, 5);
		});
	});

	suite('Get All Tags', () => {
		test('should get all unique tags from notes', () => {
			const notes = [
				createMockNote('note1', 'Content 1', ['TODO', 'BUG']),
				createMockNote('note2', 'Content 2', ['FIXME', 'TODO']),
				createMockNote('note3', 'Content 3', ['custom'])
			];

			const tags = TagManager.getAllTags(notes);

			assert.strictEqual(tags.length, 4);
			assert.ok(tags.includes('BUG'));
			assert.ok(tags.includes('FIXME'));
			assert.ok(tags.includes('TODO'));
			assert.ok(tags.includes('custom'));
		});

		test('should return sorted tags', () => {
			const notes = [
				createMockNote('note1', 'Content', ['zebra', 'apple', 'middle'])
			];

			const tags = TagManager.getAllTags(notes);

			assert.deepStrictEqual(tags, ['apple', 'middle', 'zebra']);
		});

		test('should handle notes with no tags', () => {
			const notes = [
				createMockNote('note1', 'Content 1', []),
				createMockNote('note2', 'Content 2')
			];

			const tags = TagManager.getAllTags(notes);
			assert.strictEqual(tags.length, 0);
		});

		test('should handle empty notes array', () => {
			const tags = TagManager.getAllTags([]);
			assert.strictEqual(tags.length, 0);
		});

		test('should remove duplicates across notes', () => {
			const notes = [
				createMockNote('note1', 'Content', ['TODO', 'BUG']),
				createMockNote('note2', 'Content', ['TODO', 'FIXME']),
				createMockNote('note3', 'Content', ['BUG'])
			];

			const tags = TagManager.getAllTags(notes);
			assert.strictEqual(tags.length, 3);
		});
	});

	suite('Get Tag Statistics', () => {
		test('should calculate tag statistics', () => {
			const notes = [
				createMockNote('note1', 'Content', ['TODO', 'BUG']),
				createMockNote('note2', 'Content', ['TODO', 'FIXME']),
				createMockNote('note3', 'Content', ['TODO']),
				createMockNote('note4', 'Content', ['BUG'])
			];

			const stats = TagManager.getTagStatistics(notes);

			assert.strictEqual(stats.totalUniqueTags, 3);
			assert.strictEqual(stats.tagCounts.get('TODO'), 3);
			assert.strictEqual(stats.tagCounts.get('BUG'), 2);
			assert.strictEqual(stats.tagCounts.get('FIXME'), 1);
		});

		test('should sort tags by count descending', () => {
			const notes = [
				createMockNote('note1', 'Content', ['TODO', 'BUG']),
				createMockNote('note2', 'Content', ['TODO', 'FIXME']),
				createMockNote('note3', 'Content', ['TODO'])
			];

			const stats = TagManager.getTagStatistics(notes);

			assert.strictEqual(stats.topTags[0].tag, 'TODO');
			assert.strictEqual(stats.topTags[0].count, 3);
			assert.strictEqual(stats.topTags[1].tag, 'BUG');
			assert.strictEqual(stats.topTags[1].count, 1);
			assert.strictEqual(stats.topTags[2].tag, 'FIXME');
			assert.strictEqual(stats.topTags[2].count, 1);
		});

		test('should handle empty notes array', () => {
			const stats = TagManager.getTagStatistics([]);

			assert.strictEqual(stats.totalUniqueTags, 0);
			assert.strictEqual(stats.tagCounts.size, 0);
			assert.strictEqual(stats.topTags.length, 0);
		});

		test('should handle notes with no tags', () => {
			const notes = [
				createMockNote('note1', 'Content', []),
				createMockNote('note2', 'Content')
			];

			const stats = TagManager.getTagStatistics(notes);
			assert.strictEqual(stats.totalUniqueTags, 0);
		});
	});

	suite('Parse Tags from String', () => {
		test('should parse comma-separated tags', () => {
			const tags = TagManager.parseTagsFromString('TODO, BUG, custom');

			assert.strictEqual(tags.length, 3);
			assert.ok(tags.includes('TODO'));
			assert.ok(tags.includes('BUG'));
			assert.ok(tags.includes('custom'));
		});

		test('should trim whitespace', () => {
			const tags = TagManager.parseTagsFromString('  TODO  ,  BUG  ,  custom  ');

			assert.strictEqual(tags.length, 3);
			assert.ok(tags.includes('TODO'));
		});

		test('should normalize predefined categories', () => {
			const tags = TagManager.parseTagsFromString('todo, bug, fixme');

			assert.ok(tags.includes('TODO'));
			assert.ok(tags.includes('BUG'));
			assert.ok(tags.includes('FIXME'));
		});

		test('should handle empty string', () => {
			const tags = TagManager.parseTagsFromString('');
			assert.strictEqual(tags.length, 0);
		});

		test('should handle whitespace-only string', () => {
			const tags = TagManager.parseTagsFromString('   ');
			assert.strictEqual(tags.length, 0);
		});

		test('should skip invalid tags', () => {
			const tags = TagManager.parseTagsFromString('TODO, , valid, ');

			assert.strictEqual(tags.length, 2);
			assert.ok(tags.includes('TODO'));
			assert.ok(tags.includes('valid'));
		});

		test('should remove duplicates', () => {
			const tags = TagManager.parseTagsFromString('TODO, todo, TODO, custom, custom');

			assert.strictEqual(tags.length, 2);
			assert.ok(tags.includes('TODO'));
			assert.ok(tags.includes('custom'));
		});
	});

	suite('Format Tags for Display', () => {
		test('should format tags with brackets', () => {
			const formatted = TagManager.formatTagsForDisplay(['TODO', 'BUG', 'custom']);
			assert.strictEqual(formatted, '[TODO] [BUG] [custom]');
		});

		test('should handle single tag', () => {
			const formatted = TagManager.formatTagsForDisplay(['TODO']);
			assert.strictEqual(formatted, '[TODO]');
		});

		test('should handle empty array', () => {
			const formatted = TagManager.formatTagsForDisplay([]);
			assert.strictEqual(formatted, '');
		});

		test('should handle undefined', () => {
			const formatted = TagManager.formatTagsForDisplay(undefined as any);
			assert.strictEqual(formatted, '');
		});
	});

	suite('Get Suggested Tags', () => {
		test('should suggest most used tags', () => {
			const notes = [
				createMockNote('note1', 'Content', ['TODO', 'BUG']),
				createMockNote('note2', 'Content', ['TODO', 'FIXME']),
				createMockNote('note3', 'Content', ['TODO']),
				createMockNote('note4', 'Content', ['BUG', 'REVIEW'])
			];

			const suggested = TagManager.getSuggestedTags(notes, 3);

			assert.strictEqual(suggested.length, 3);
			assert.strictEqual(suggested[0], 'TODO'); // count: 3
			assert.strictEqual(suggested[1], 'BUG'); // count: 2
		});

		test('should limit suggestions to specified limit', () => {
			const notes = [
				createMockNote('note1', 'Content', ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'])
			];

			const suggested = TagManager.getSuggestedTags(notes, 2);
			assert.strictEqual(suggested.length, 2);
		});

		test('should use default limit of 10', () => {
			const notes = Array.from({ length: 15 }, (_, i) =>
				createMockNote(`note${i}`, 'Content', [`tag${i}`])
			);

			const suggested = TagManager.getSuggestedTags(notes);
			assert.ok(suggested.length <= 10);
		});

		test('should handle empty notes array', () => {
			const suggested = TagManager.getSuggestedTags([]);
			assert.strictEqual(suggested.length, 0);
		});
	});

	suite('Add Tags to Note', () => {
		test('should add new tags to note', () => {
			const note = createMockNote('note1', 'Content', ['TODO']);
			TagManager.addTagsToNote(note, ['BUG', 'custom']);

			assert.strictEqual(note.tags!.length, 3);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('BUG'));
			assert.ok(note.tags!.includes('custom'));
		});

		test('should avoid adding duplicate tags', () => {
			const note = createMockNote('note1', 'Content', ['TODO']);
			TagManager.addTagsToNote(note, ['TODO', 'BUG']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('BUG'));
		});

		test('should normalize tags before adding', () => {
			const note = createMockNote('note1', 'Content', ['TODO']);
			TagManager.addTagsToNote(note, ['todo', 'bug']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('BUG'));
		});

		test('should skip invalid tags', () => {
			const note = createMockNote('note1', 'Content', []);
			TagManager.addTagsToNote(note, ['TODO', 'tag,with,comma', 'valid']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('valid'));
		});

		test('should initialize tags array if undefined', () => {
			const note = createMockNote('note1', 'Content');
			note.tags = undefined;
			TagManager.addTagsToNote(note, ['TODO']);

			assert.ok(note.tags);
			assert.strictEqual(note.tags!.length, 1);
		});

		test('should handle empty tags array', () => {
			const note = createMockNote('note1', 'Content', ['TODO']);
			TagManager.addTagsToNote(note, []);

			assert.strictEqual(note.tags!.length, 1);
		});
	});

	suite('Remove Tags from Note', () => {
		test('should remove specified tags', () => {
			const note = createMockNote('note1', 'Content', ['TODO', 'BUG', 'custom']);
			TagManager.removeTagsFromNote(note, ['BUG']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('custom'));
			assert.ok(!note.tags!.includes('BUG'));
		});

		test('should remove multiple tags', () => {
			const note = createMockNote('note1', 'Content', ['TODO', 'BUG', 'custom']);
			TagManager.removeTagsFromNote(note, ['TODO', 'BUG']);

			assert.strictEqual(note.tags!.length, 1);
			assert.ok(note.tags!.includes('custom'));
		});

		test('should handle removing non-existent tags', () => {
			const note = createMockNote('note1', 'Content', ['TODO']);
			TagManager.removeTagsFromNote(note, ['BUG', 'nonexistent']);

			assert.strictEqual(note.tags!.length, 1);
			assert.ok(note.tags!.includes('TODO'));
		});

		test('should handle note with no tags', () => {
			const note = createMockNote('note1', 'Content', []);
			TagManager.removeTagsFromNote(note, ['TODO']);

			assert.strictEqual(note.tags!.length, 0);
		});

		test('should handle note with undefined tags', () => {
			const note = createMockNote('note1', 'Content');
			note.tags = undefined;
			TagManager.removeTagsFromNote(note, ['TODO']);

			// Should not throw error
			assert.ok(true);
		});

		test('should handle empty removal array', () => {
			const note = createMockNote('note1', 'Content', ['TODO', 'BUG']);
			TagManager.removeTagsFromNote(note, []);

			assert.strictEqual(note.tags!.length, 2);
		});
	});

	suite('Set Note Tags', () => {
		test('should replace all tags', () => {
			const note = createMockNote('note1', 'Content', ['TODO', 'BUG']);
			TagManager.setNoteTags(note, ['FIXME', 'custom']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('FIXME'));
			assert.ok(note.tags!.includes('custom'));
			assert.ok(!note.tags!.includes('TODO'));
			assert.ok(!note.tags!.includes('BUG'));
		});

		test('should normalize tags', () => {
			const note = createMockNote('note1', 'Content', []);
			TagManager.setNoteTags(note, ['todo', 'bug']);

			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('BUG'));
		});

		test('should remove duplicates', () => {
			const note = createMockNote('note1', 'Content', []);
			TagManager.setNoteTags(note, ['TODO', 'todo', 'BUG', 'bug']);

			assert.strictEqual(note.tags!.length, 2);
		});

		test('should skip invalid tags', () => {
			const note = createMockNote('note1', 'Content', []);
			TagManager.setNoteTags(note, ['TODO', 'tag,comma', 'valid']);

			assert.strictEqual(note.tags!.length, 2);
			assert.ok(note.tags!.includes('TODO'));
			assert.ok(note.tags!.includes('valid'));
		});

		test('should clear tags when given empty array', () => {
			const note = createMockNote('note1', 'Content', ['TODO', 'BUG']);
			TagManager.setNoteTags(note, []);

			assert.strictEqual(note.tags!.length, 0);
		});
	});
});
