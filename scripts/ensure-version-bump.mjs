#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DIFF_RANGE = 'HEAD~1..HEAD';
const MEANINGFUL_FILE_PATTERNS = [
    /^src\//,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^tsconfig\.json$/,
    /^tsconfig\.build\.json$/,
    /^\.npmignore$/,
    /^\.eslintrc\.js$/,
];

function run(command) {
    return execSync(command, { encoding: 'utf8' }).trim();
}

function safeRun(command) {
    try {
        return run(command);
    } catch (error) {
        return null;
    }
}

function fail(message) {
    console.error(`\n[version-guard] ${message}`);
    process.exit(1);
}

function info(message) {
    console.log(`[version-guard] ${message}`);
}

const hasPreviousCommit = safeRun('git rev-parse --verify HEAD~1');

if (!hasPreviousCommit) {
    info('HEAD~1 is unavailable. Skipping version bump check.');
    process.exit(0);
}

const changedFilesOutput = run(`git diff --name-only ${DIFF_RANGE}`);
const changedFiles = changedFilesOutput.split('\n').filter(Boolean);
const meaningfulChanges = changedFiles.filter((file) =>
    MEANINGFUL_FILE_PATTERNS.some((pattern) => pattern.test(file)),
);

if (meaningfulChanges.length === 0) {
    info('No runtime/package-impacting files changed. Version bump not required.');
    process.exit(0);
}

const previousPackageJsonContent = safeRun('git show HEAD~1:package.json');
if (!previousPackageJsonContent) {
    info('package.json is not present in HEAD~1. Skipping version comparison.');
    process.exit(0);
}

const previousPackageJson = JSON.parse(previousPackageJsonContent);
const currentPackageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const previousVersion = previousPackageJson.version;
const currentVersion = currentPackageJson.version;

if (!previousVersion || !currentVersion) {
    fail('Could not read package.json version in current or previous commit.');
}

if (previousVersion === currentVersion) {
    fail(
        [
            `Meaningful files changed (${meaningfulChanges.join(', ')}) but package.json version stayed ${currentVersion}.`,
            'Every meaningful runtime/package change must bump package.json version.',
        ].join('\n'),
    );
}

info(`Version bump detected: ${previousVersion} -> ${currentVersion}.`);
