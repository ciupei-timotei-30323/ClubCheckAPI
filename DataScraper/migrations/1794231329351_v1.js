/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {

    pgm.createTable('sources', {
        id: 'id',
        url: {type: 'varchar(100)', notNull: true},
        method: {type: 'varchar(100)', notNull: true},
        api_url: {type: 'varchar(1000)', notNull: false},
        sitemap_available: {type: 'bool', notNull: false},
        description: {type: 'varchar(2000)', notNull: false}
    });

    pgm.createTable('pages', {
        id: 'id',
        url: {type: 'varchar(2000)', notNull: true},
        sourceId: {
            type: 'integer',
            notNull: true,
            references: '"sources"',
            onDelete: 'CASCADE'
        },
        is_scraped: {type: 'bool', default: true}
    })

    
    
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {};
