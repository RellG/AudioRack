const { sequelize } = require('../database');
const { QueryInterface } = require('sequelize');

async function addEnterpriseColumns() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Check if columns exist before adding
    const tableDescription = await queryInterface.describeTable('equipment');
    
    // Add new columns to equipment table if they don't exist
    const columnsToAdd = [
      {
        name: 'purchasePrice',
        definition: {
          type: 'DECIMAL(10, 2)',
          allowNull: true
        }
      },
      {
        name: 'vendor',
        definition: {
          type: 'VARCHAR(100)',
          allowNull: true
        }
      },
      {
        name: 'model',
        definition: {
          type: 'VARCHAR(100)',
          allowNull: true
        }
      },
      {
        name: 'barcode',
        definition: {
          type: 'VARCHAR(50)',
          allowNull: true,
          unique: true
        }
      },
      {
        name: 'priority',
        definition: {
          type: 'VARCHAR(20)',
          allowNull: true,
          defaultValue: 'medium'
        }
      },
      {
        name: 'maintenanceDate',
        definition: {
          type: 'TIMESTAMP WITH TIME ZONE',
          allowNull: true
        }
      },
      {
        name: 'isReserved',
        definition: {
          type: 'BOOLEAN',
          allowNull: true,
          defaultValue: false
        }
      },
      {
        name: 'reservedBy',
        definition: {
          type: 'UUID',
          allowNull: true
        }
      },
      {
        name: 'reservedUntil',
        definition: {
          type: 'TIMESTAMP WITH TIME ZONE',
          allowNull: true
        }
      }
    ];

    for (const column of columnsToAdd) {
      if (!tableDescription[column.name]) {
        console.log(`➕ Adding column: ${column.name}`);
        await queryInterface.addColumn('equipment', column.name, column.definition);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }

    // Create equipment_history table if it doesn't exist
    try {
      await queryInterface.createTable('equipment_history', {
        id: {
          type: 'UUID',
          defaultValue: sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        equipmentId: {
          type: 'UUID',
          allowNull: false,
          references: {
            model: 'equipment',
            key: 'id'
          }
        },
        actionType: {
          type: 'VARCHAR(20)',
          allowNull: false
        },
        oldValues: {
          type: 'JSONB',
          allowNull: true
        },
        newValues: {
          type: 'JSONB',
          allowNull: true
        },
        userId: {
          type: 'UUID',
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        userName: {
          type: 'VARCHAR(255)',
          allowNull: false
        },
        teamId: {
          type: 'VARCHAR(50)',
          allowNull: false
        },
        notes: {
          type: 'TEXT',
          allowNull: true
        },
        ipAddress: {
          type: 'INET',
          allowNull: true
        },
        userAgent: {
          type: 'TEXT',
          allowNull: true
        },
        createdAt: {
          type: 'TIMESTAMP WITH TIME ZONE',
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Created equipment_history table');
    } catch (error) {
      if (error.name === 'SequelizeDatabaseError' && error.parent.code === '42P07') {
        console.log('✅ equipment_history table already exists');
      } else {
        throw error;
      }
    }

    // Add indexes for better performance
    try {
      await queryInterface.addIndex('equipment_history', ['equipmentId'], {
        name: 'equipment_history_equipment_idx'
      });
    } catch (error) {
      if (error.parent && error.parent.code !== '42P07') {
        console.log('Index may already exist:', error.message);
      }
    }

    try {
      await queryInterface.addIndex('equipment_history', ['teamId'], {
        name: 'equipment_history_team_idx'
      });
    } catch (error) {
      if (error.parent && error.parent.code !== '42P07') {
        console.log('Index may already exist:', error.message);
      }
    }

    // Create priority enum type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✅ Created priority enum type');
    } catch (error) {
      console.log('Priority enum may already exist');
    }

    // Create action type enum if it doesn't exist
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE action_type_enum AS ENUM ('created', 'updated', 'status_changed', 'deleted', 'restored');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✅ Created action type enum type');
    } catch (error) {
      console.log('Action type enum may already exist');
    }

    // Update priority column to use enum
    try {
      await sequelize.query(`
        ALTER TABLE equipment 
        ALTER COLUMN priority TYPE priority_enum 
        USING priority::priority_enum;
      `);
      console.log('✅ Updated priority column to use enum');
    } catch (error) {
      console.log('Priority column enum conversion may have already been done');
    }

    // Update action type column to use enum
    try {
      await sequelize.query(`
        ALTER TABLE equipment_history 
        ALTER COLUMN "actionType" TYPE action_type_enum 
        USING "actionType"::action_type_enum;
      `);
      console.log('✅ Updated actionType column to use enum');
    } catch (error) {
      console.log('ActionType column enum conversion may have already been done');
    }

    console.log('🎉 Database migrations completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = { addEnterpriseColumns };